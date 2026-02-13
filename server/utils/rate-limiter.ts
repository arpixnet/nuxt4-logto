/**
 * Rate Limiter Utility using rate-limiter-flexible
 *
 * Provides rate limiting functionality for server API endpoints using Redis.
 *
 * IMPORTANT: For user-specific operations (account deletion, password change),
 * always provide the userId in the identifier to rate limit per-user, not per-IP.
 *
 * Example:
 * ```typescript
 * const rateLimitResult = await checkRateLimit({
 *   key: `account-delete:${userId}`,
 *   points: 3,
 *   duration: 3600 // 1 hour
 * })
 * ```
 */

import Redis from 'ioredis'
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible'
import { rateLimitLogger, logError } from './logger'
import type { H3Event } from 'h3'

export interface RateLimitConfig {
  /** Unique key for rate limiting (e.g., 'account-delete:userId123') */
  key: string
  /** Maximum number of requests allowed */
  points: number
  /** Duration in seconds */
  duration: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
  msBeforeNext: number
}

// Redis client (singleton)
let redisClient: Redis | null = null
let useRedis = false

// In-memory fallback for when Redis is unavailable
const rateLimiterMemory = new RateLimiterMemory({
  points: 100,
  duration: 60
})

/**
 * Initialize Redis connection and rate limiter
 */
function initializeRedis(): void {
  if (redisClient !== null) {
    return
  }

  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => {
        if (times > 3) {
          rateLimitLogger.warn('Redis connection failed after 3 retries, using memory fallback')
          useRedis = false
          return null
        }
        return Math.min(times * 100, 2000)
      }
    })

    if (process.env.REDIS_PASSWORD) {
      redisClient.options.password = process.env.REDIS_PASSWORD
    }

    redisClient.on('connect', () => {
      rateLimitLogger.info('Connected to Redis')
      useRedis = true
    })

    redisClient.on('error', (err) => {
      logError(rateLimitLogger, err, 'Redis error')
      useRedis = false
    })

    redisClient.on('close', () => {
      rateLimitLogger.warn('Redis connection closed, using in-memory fallback')
      useRedis = false
    })
  } catch (error) {
    logError(rateLimitLogger, error, 'Failed to initialize Redis')
  }
}

// Initialize on module load
initializeRedis()

/**
 * Check if a request should be rate limited
 *
 * @param config - Rate limit configuration
 * @param config.key - Unique identifier (e.g., 'account-delete:userId123')
 * @param config.points - Maximum requests allowed
 * @param config.duration - Time window in seconds
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  // Create a limiter with the specific config for this operation
  try {
    const operationLimiter = useRedis && redisClient
      ? new RateLimiterRedis({
          storeClient: redisClient,
          keyPrefix: 'ratelimit',
          points: config.points,
          duration: config.duration,
          insuranceLimiter: rateLimiterMemory
        })
      : new RateLimiterMemory({
          points: config.points,
          duration: config.duration
        })

    const result = await operationLimiter.consume(config.key)

    return {
      allowed: true,
      remaining: result.remainingPoints,
      resetAt: Math.floor((Date.now() + result.msBeforeNext) / 1000),
      limit: config.points,
      msBeforeNext: result.msBeforeNext
    }
  } catch (rejRes: unknown) {
    if (rejRes instanceof Error) {
      // Redis error, fallback allowed
      rateLimitLogger.warn({ key: config.key, error: rejRes }, 'Redis error, allowing request')
      return {
        allowed: true,
        remaining: 0,
        resetAt: Math.floor(Date.now() / 1000) + config.duration,
        limit: config.points,
        msBeforeNext: config.duration * 1000
      }
    }

    // Rate limit exceeded - rejRes is RateLimiterRes object
    const rateLimitRej = rejRes as { remainingPoints?: number, msBeforeNext: number }

    rateLimitLogger.warn({
      key: config.key,
      limit: config.points,
      remaining: rateLimitRej.remainingPoints || 0,
      msBeforeNext: rateLimitRej.msBeforeNext
    }, 'Rate limit exceeded')

    return {
      allowed: false,
      remaining: rateLimitRej.remainingPoints || 0,
      resetAt: Math.floor((Date.now() + rateLimitRej.msBeforeNext) / 1000),
      limit: config.points,
      msBeforeNext: rateLimitRej.msBeforeNext
    }
  }
}

/**
 * Throw a rate limit error
 */
export function throwRateLimitError(result: RateLimitResult): never {
  const resetInMinutes = Math.ceil(result.msBeforeNext / 1000 / 60)

  throw createError({
    statusCode: 429,
    statusMessage: 'Too Many Requests',
    message: `Rate limit exceeded. Please try again in ${resetInMinutes} minute${resetInMinutes !== 1 ? 's' : ''}.`,
    data: {
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.resetAt
    }
  })
}

/**
 * Get client IP from request (for IP-based rate limiting)
 * Note: Renamed to avoid collision with h3's getRequestIP
 */
export function getClientIP(event: H3Event): string {
  const headers = event.node.req.headers

  const forwardedFor = headers['x-forwarded-for']
  if (forwardedFor) {
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
    if (ip) {
      const parts = ip.split(',')
      if (parts[0]?.trim()) return parts[0].trim()
    }
  }

  const realIp = headers['x-real-ip']
  if (realIp) {
    const ip = Array.isArray(realIp) ? realIp[0] : realIp
    if (ip) return ip
  }

  return event.node.req.socket.remoteAddress || 'unknown'
}

/**
 * Clear rate limit for a specific key (development only)
 */
export async function clearRateLimit(key: string): Promise<{ success: boolean }> {
  try {
    // Clear from Redis
    if (redisClient) {
      await redisClient.del(`ratelimit:${key}`)
    }

    // Memory limiter doesn't have a direct delete, but it will expire naturally
    rateLimitLogger.info({ key }, 'Cleared rate limit')
    return { success: true }
  } catch (error) {
    rateLimitLogger.error({ key, error }, 'Failed to clear rate limit')
    return { success: false }
  }
}

/**
 * Clear all rate limits (development only)
 */
export async function clearAllRateLimits(): Promise<{ count: number }> {
  try {
    let count = 0

    // Clear from Redis
    if (redisClient) {
      const keys = await redisClient.keys('ratelimit:*')
      if (keys.length > 0) {
        await redisClient.del(...keys)
        count = keys.length
      }
    }

    rateLimitLogger.info({ count }, 'Cleared all rate limits')
    return { count }
  } catch (error) {
    rateLimitLogger.error({ error }, 'Failed to clear all rate limits')
    return { count: 0 }
  }
}
