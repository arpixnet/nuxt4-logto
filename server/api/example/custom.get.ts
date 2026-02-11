/**
 * Custom Configuration Endpoint
 *
 * Demonstrates dynamic configuration using API_CONFIG utilities.
 * Shows how to:
 * - Use isPublicRoute() for dynamic public route detection
 * - Use isProtectedRoute() for dynamic protected route detection
 * - Use getRateLimitConfig() for route-specific rate limits
 * - Use getSecurityHeaders() for custom security headers
 *
 * @route GET /api/example/custom
 * @public true (determined by config)
 * @auth none
 *
 * @example
 * curl http://localhost:3000/api/example/custom
 *
 * @returns Dynamic configuration information
 */

import {
  isPublicRoute,
  isProtectedRoute,
  getRateLimitConfig,
  getSecurityHeaders
} from '../../utils/api-middleware-config'
import { apiLogger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const route = event.path

  apiLogger.info(
    {
      path: route,
      method: event.method
    },
    'Custom endpoint requested'
  )

  // Dynamic public route detection
  if (isPublicRoute(route)) {
    event.context.apiPublic = true
    apiLogger.debug(
      { route },
      'Route marked as public via config'
    )
  }

  // Dynamic protected route detection
  if (isProtectedRoute(route)) {
    event.context.apiProtected = true
    apiLogger.debug(
      { route },
      'Route marked as protected via config'
    )
  }

  // Get route-specific rate limit config
  const rateLimitConfig = getRateLimitConfig(route)

  apiLogger.debug(
    {
      route,
      rateLimitConfig
    },
    'Route-specific rate limit config'
  )

  // Get security headers
  const securityHeaders = getSecurityHeaders()

  apiLogger.debug(
    {
      route,
      securityHeaders
    },
    'Security headers retrieved'
  )

  // Return dynamic configuration info
  return {
    route,
    isPublic: isPublicRoute(route),
    isProtected: isProtectedRoute(route),
    rateLimitConfig: {
      maxRequests: rateLimitConfig.maxRequests,
      windowSeconds: rateLimitConfig.windowSeconds,
      requestsPerMinute: Math.round(
        (rateLimitConfig.maxRequests / rateLimitConfig.windowSeconds) * 60
      )
    },
    securityHeaders: {
      count: Object.keys(securityHeaders).length,
      headers: Object.keys(securityHeaders)
    },
    features: [
      'Dynamic public route detection via isPublicRoute()',
      'Dynamic protected route detection via isProtectedRoute()',
      'Route-specific rate limits via getRateLimitConfig()',
      'Security headers via getSecurityHeaders()',
      'Configured in API_CONFIG (api-middleware-config.ts)'
    ],
    timestamp: new Date().toISOString()
  }
})
