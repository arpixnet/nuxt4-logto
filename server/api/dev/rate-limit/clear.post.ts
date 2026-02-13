/**
 * Development-only endpoint to clear rate limit entries
 *
 * This endpoint is only available in development mode.
 * Use it to reset rate limits during testing.
 *
 * Usage:
 * - Clear all: POST /api/dev/rate-limit/clear
 * - Clear specific key: POST /api/dev/rate-limit/clear { "key": "account-delete:userId" }
 */

import { clearRateLimit, clearAllRateLimits } from '../../../utils/rate-limiter'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('dev-rate-limit')

interface ClearBody {
  key?: string
}

export default defineEventHandler(async (event) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Attempted to access dev endpoint in production')
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found'
    })
  }

  let body: ClearBody = {}
  try {
    body = await readBody<ClearBody>(event) || {}
  } catch {
    body = {}
  }

  if (body.key) {
    const result = await clearRateLimit(body.key)
    return {
      success: result.success,
      action: 'clear_key',
      key: body.key
    }
  } else {
    const result = await clearAllRateLimits()
    return {
      success: true,
      action: 'clear_all',
      count: result.count
    }
  }
})
