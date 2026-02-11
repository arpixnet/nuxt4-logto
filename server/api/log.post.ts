/**
 * Client Log Endpoint
 *
 * Receives log messages from the client side.
 * This endpoint should only be used for CRITICAL logs from the frontend.
 *
 * Security note: Rate limiting is enforced to prevent abuse.
 */

import { logClientEvent, sessionLogger } from '../utils/logger'
import { checkRateLimit } from '../utils/rate-limiter'
import type { H3Event } from 'h3'

interface ClientLogBody {
  level: 'error' | 'warn' | 'info' | 'debug'
  context: string
  message: string
  data?: Record<string, unknown>
  userId?: string
  sessionId?: string
}

export default defineEventHandler(async (event: H3Event) => {
  // Rate limiting: 50 logs per minute per client (reduced from 100)
  const rateLimitResult = await checkRateLimit(event, {
    maxRequests: 50,
    windowSeconds: 60,
    identifier: `client-log:${getClientIp(event)}`
  })

  if (!rateLimitResult.allowed) {
    sessionLogger.warn('Client log rate limit exceeded')
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Too many log requests. Please slow down.'
    })
  }

  try {
    const body = await readBody<ClientLogBody>(event)
    const { level, context, message, data, userId, sessionId } = body

    // Validate required fields
    if (!level || !context || !message) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Missing required fields: level, context, message'
      })
    }

    // Validate level
    const validLevels = ['error', 'warn', 'info', 'debug']
    if (!validLevels.includes(level)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Invalid level. Must be one of: ${validLevels.join(', ')}`
      })
    }

    // Gather client information
    const clientInfo = {
      userAgent: getRequestHeader(event, 'user-agent'),
      ip: getClientIp(event),
      referer: getRequestHeader(event, 'referer'),
      userId,
      sessionId
    }

    // Log the client event
    logClientEvent(level, context, message, data, clientInfo)

    // Return success
    return {
      success: true,
      logged: true
    }
  } catch (error: unknown) {
    // Don't log errors from the log endpoint itself to prevent infinite loops
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    return {
      success: false,
      logged: false
    }
  }
})

/**
 * Helper function to get the client IP address
 * Checks multiple headers in order of priority
 */
function getClientIp(event: H3Event): string {
  // Check Cloudflare
  const cfConnectingIp = getRequestHeader(event, 'cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp

  // Check standard forwarded headers
  const xForwardedFor = getRequestHeader(event, 'x-forwarded-for')
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const ips = xForwardedFor.split(',')
    return (ips[0] || xForwardedFor).trim()
  }

  // Check real IP header
  const xRealIp = getRequestHeader(event, 'x-real-ip')
  if (xRealIp) return xRealIp

  // Fallback to socket address
  return event.node.req.socket?.remoteAddress || 'unknown'
}
