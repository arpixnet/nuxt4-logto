/**
 * Rate Limited Endpoint
 *
 * Protected endpoint demonstrating rate limiting headers.
 * Shows:
 * - How rate limiting is applied automatically
 * - Rate limit headers included in response
 * - Reading rate limit headers from request/response
 * - Different rate limits for different routes
 *
 * @route GET /api/example/rate-limited
 * @public false
 * @auth required (JWT token)
 *
 * @example
 * curl -H "Authorization: Bearer <token>" http://localhost:3000/api/example/rate-limited
 *
 * @returns Rate limit information from headers
 */

import { apiLogger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  // Mark as protected route
  event.context.apiProtected = true

  // User is available and validated
  const user = event.context.user

  if (!user) {
    apiLogger.error(
      {
        path: event.path,
        method: event.method
      },
      'User context not available - middleware error'
    )

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error: User context not available'
    })
  }

  apiLogger.info(
    {
      path: event.path,
      method: event.method,
      userId: user.sub
    },
    'Rate limited endpoint requested'
  )

  // Get rate limit headers from response (set by api-auth middleware)
  const rateLimitHeaders = {
    limit: event.node.res.getHeader('X-RateLimit-Limit') || '100',
    remaining: event.node.res.getHeader('X-RateLimit-Remaining') || 'unknown',
    reset: event.node.res.getHeader('X-RateLimit-Reset') || 'unknown'
  }

  apiLogger.debug(
    {
      userId: user.sub,
      rateLimitHeaders
    },
    'Rate limit headers retrieved'
  )

  // Get security headers
  const securityHeaders = {
    contentTypeOptions: event.node.res.getHeader('X-Content-Type-Options'),
    frameOptions: event.node.res.getHeader('X-Frame-Options'),
    xssProtection: event.node.res.getHeader('X-XSS-Protection'),
    referrerPolicy: event.node.res.getHeader('Referrer-Policy'),
    csp: event.node.res.getHeader('Content-Security-Policy')
  }

  apiLogger.debug(
    {
      userId: user.sub,
      securityHeaders: Object.keys(securityHeaders).filter(k => securityHeaders[k as keyof typeof securityHeaders])
    },
    'Security headers retrieved'
  )

  // Return rate limit and security information
  return {
    user: {
      userId: user.sub,
      email: user.email
    },
    rateLimit: {
      limit: parseInt(rateLimitHeaders.limit as string),
      remaining: parseInt(rateLimitHeaders.remaining as string),
      reset: parseInt(rateLimitHeaders.reset as string),
      resetDate: new Date(parseInt(rateLimitHeaders.reset as string) * 1000).toISOString(),
      note: 'These headers are automatically added by api-auth middleware'
    },
    securityHeaders: {
      applied: true,
      headers: Object.fromEntries(
        Object.entries(securityHeaders).filter(([_, v]) => v)
      ),
      note: 'Security headers are automatically added by api-auth middleware'
    },
    features: [
      'JWT token validated',
      'Rate limiting applied (100 req/15 min default)',
      'Rate limit headers in response (X-RateLimit-*)',
      'Security headers in response',
      'User authenticated'
    ],
    timestamp: new Date().toISOString()
  }
})
