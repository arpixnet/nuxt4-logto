/**
 * Health Check Endpoint
 *
 * Public endpoint to check API and server health status.
 * Demonstrates:
 * - Using event.context.apiPublic to mark as public route
 * - Security headers are automatically added by api-auth middleware
 * - Rate limiting is applied (100 req/15 min default)
 *
 * @route GET /api/example/health
 * @public true (apiPublic flag set)
 * @auth none
 *
 * @example
 * curl http://localhost:3000/api/example/health
 */

import { apiLogger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  // Mark as public route - api-auth will only add security headers
  // api-protected middleware will skip this route
  event.context.apiPublic = true

  apiLogger.info({
    path: event.path,
    method: event.method
  }, 'Health check requested')

  // Simulate health check
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  }

  apiLogger.debug({
    health
  }, 'Health check response')

  return health
})
