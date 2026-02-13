import type { LogtoPasswordVerificationResponse, LogtoUser } from '../../types/logto'
import { createLogger } from '../../utils/logger'
import { checkRateLimit, throwRateLimitError } from '../../utils/rate-limiter'
import {
  logtoProxy,
  getErrorCode,
  getErrorMessage,
  getErrorSubCodes,
  getErrorStatus,
  normalizeCode,
  createApiError
} from '../../utils/logto-proxy'

const logger = createLogger('password-change')

/**
 * Password change flow for Logto Account API:
 * 1. Verify current password via POST /api/verifications/password
 * 2. Use the verificationRecordId as logto-verification-id header
 * 3. POST /api/my-account/password with the new password
 *
 * Errors are forwarded with { errorType, code, subCodes } so the client
 * can display specific i18n messages.
 *
 * Rate limited: 5 attempts per 15 minutes per user.
 */

export default defineEventHandler(async (event) => {
  // Get userId for per-user rate limiting
  const logtoUser = event.context.logtoUser as LogtoUser | undefined
  const userId = logtoUser?.sub

  const body = await readBody(event)
  const { currentPassword, password } = body

  if (!password) {
    throw createApiError(400, {
      errorType: 'validation',
      code: 'missing_password',
      message: 'New password is required'
    })
  }

  // Rate limiting: Per-user rate limit (5 attempts per 15 minutes per user)
  // Falls back to IP-based if userId not available
  const rateLimitResult = await checkRateLimit({
    key: userId ? `password-change:${userId}` : `password-change:ip`,
    points: 5,
    duration: 900 // 15 minutes
  })

  if (!rateLimitResult.allowed) {
    logger.warn('Password change rate limit exceeded')
    throwRateLimitError(rateLimitResult)
  }

  // Step 1: Verify current password
  let verificationId: string | undefined
  if (currentPassword) {
    try {
      const verifyResult = await logtoProxy<LogtoPasswordVerificationResponse>(
        event,
        '/password',
        {
          method: 'POST',
          body: { password: currentPassword },
          apiBase: 'verifications'
        }
      )
      verificationId = verifyResult?.verificationRecordId
    } catch (error: unknown) {
      logger.error({ error }, 'Password verification failed')
      // This means the current password is wrong
      throw createApiError(422, {
        errorType: 'verification',
        code: normalizeCode(getErrorCode(error) || 'session__verification_failed'),
        message: 'Current password is incorrect'
      })
    }
  }

  // Step 2: Update password with verification
  try {
    if (!verificationId) {
      logger.warn('No verificationId available for password update')
    }

    await logtoProxy(event, '/password', {
      method: 'POST',
      body: { password },
      verificationId
    })

    logger.info('Password updated successfully')
    return { success: true }
  } catch (error: unknown) {
    // Extract more detailed error info
    const errorStatus = getErrorStatus(error)
    const errorCode = getErrorCode(error)
    const errorMessage = getErrorMessage(error)
    const errorSubCodes = getErrorSubCodes(error)

    logger.error({
      status: errorStatus,
      code: errorCode,
      subCodes: errorSubCodes
    }, 'Password update error')

    // Extract Logto error code and sub-codes, normalize for i18n
    const logtoCode = normalizeCode(errorCode || 'unknown')

    throw createApiError(errorStatus, {
      errorType: 'password_update',
      code: logtoCode,
      message: errorMessage || 'Failed to change password',
      subCodes: errorSubCodes.length > 0 ? errorSubCodes : undefined
    })
  }
})
