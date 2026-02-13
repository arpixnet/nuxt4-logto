/**
 * Server-side API Authentication Middleware
 *
 * This middleware initializes Logto context for all API routes.
 * It ensures that Logto client is available in event.context.logtoClient
 * for protected endpoints.
 *
 * Features:
 * - Initializes Logto context for API routes
 * - Adds security headers
 * - Applies rate limiting
 * - Supports public API routes via event.context.apiPublic
 *
 * IMPORTANT: This middleware only runs on API routes, not on pages.
 */

import { logtoEventHandler } from '#logto'
import { authLogger, middlewareLogger, logError } from '../utils/logger'
import { checkRateLimit, throwRateLimitError, getClientIP } from '../utils/rate-limiter'
import type { H3Event } from 'h3'

export default defineEventHandler(async (event) => {
  // Skip if not an API route
  if (!event.path.startsWith('/api/')) {
    return
  }

  // Allow public routes marked with event.context.apiPublic
  if (event.context.apiPublic === true) {
    // Still add security headers for public routes
    addSecurityHeaders(event)
    return
  }

  // Add security headers for all API routes
  addSecurityHeaders(event)

  // Apply rate limiting
  await applyRateLimiting(event)

  const config = useRuntimeConfig(event)

  // Initialize Logto context
  try {
    await logtoEventHandler(event, config)
  } catch (error) {
    // Log error but don't throw - let individual routes handle auth
    logError(authLogger, error, 'Error initializing Logto context', {
      path: event.path,
      method: event.method
    })
  }
})

/**
 * Add security headers to response
 */
function addSecurityHeaders(event: H3Event): void {
  event.node.res.setHeader('X-Content-Type-Options', 'nosniff')
  event.node.res.setHeader('X-Frame-Options', 'DENY')
  event.node.res.setHeader('X-XSS-Protection', '1; mode=block')
  event.node.res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Content Security Policy (basic)
  event.node.res.setHeader('Content-Security-Policy', 'default-src \'self\'')
}

/**
 * Apply rate limiting to API routes
 */
async function applyRateLimiting(event: H3Event): Promise<void> {
  try {
    const ip = getClientIP(event)
    const result = await checkRateLimit({
      key: `api:${ip}`,
      points: 100,
      duration: 900 // 15 minutes
    })

    // Add rate limit headers to response
    event.node.res.setHeader('X-RateLimit-Limit', result.limit.toString())
    event.node.res.setHeader('X-RateLimit-Remaining', result.remaining.toString())
    event.node.res.setHeader('X-RateLimit-Reset', result.resetAt.toString())

    // Throw error if rate limit exceeded
    if (!result.allowed) {
      throwRateLimitError(result)
    }
  } catch (error) {
    // If rate limit check fails, log but don't block (fail open)
    if (error instanceof Error && error.message.includes('Too Many Requests')) {
      throw error // Re-throw rate limit errors
    }
    middlewareLogger.warn(
      {
        error: error instanceof Error ? error.message : String(error),
        path: event.path
      },
      'Rate limiting check failed, allowing request'
    )
  }
}
