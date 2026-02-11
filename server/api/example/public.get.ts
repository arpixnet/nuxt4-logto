/**
 * Public Data Endpoint
 *
 * Public endpoint that returns publicly accessible data.
 * Demonstrates:
 * - Using event.context.apiPublic to mark as public route
 * - No authentication required
 * - Rate limiting is applied (100 req/15 min default)
 * - Security headers are automatically added
 *
 * @route GET /api/example/public
 * @public true (apiPublic flag set)
 * @auth none
 *
 * @example
 * curl http://localhost:3000/api/example/public
 *
 * @returns Public information object
 */

import { apiLogger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  // Mark as public route
  event.context.apiPublic = true

  apiLogger.info({
    path: event.path,
    method: event.method
  }, 'Public data requested')

  // Return public data
  return {
    message: 'This is public data',
    accessibleBy: 'everyone',
    features: [
      'No authentication required',
      'Rate limiting applied (100 req/15 min)',
      'Security headers included'
    ],
    timestamp: new Date().toISOString()
  }
})
