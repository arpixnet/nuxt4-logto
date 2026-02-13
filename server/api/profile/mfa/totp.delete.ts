import type { LogtoMfaFactor, LogtoUser } from '../../../types/logto'
import { createLogger } from '../../../utils/logger'
import { checkRateLimit, throwRateLimitError } from '../../../utils/rate-limiter'
import { logtoProxy, getVerificationIdByPassword, createApiError } from '../../../utils/logto-proxy'

const logger = createLogger('totp-delete')

export default defineEventHandler(async (event) => {
  // Get userId for per-user rate limiting
  const logtoUser = event.context.logtoUser as LogtoUser | undefined
  const userId = logtoUser?.sub

  // Read password from request body
  const body = await readBody<{ password?: string }>(event).catch(() => ({ password: undefined }))
  const { password } = body

  if (!password) {
    throw createApiError(400, {
      errorType: 'validation',
      code: 'password_required',
      message: 'Password is required to disable 2FA'
    })
  }

  // Rate limiting: Per-user rate limit (5 attempts per 15 minutes per user)
  // Falls back to IP-based if userId not available
  const rateLimitResult = await checkRateLimit({
    key: userId ? `totp-disable:${userId}` : `totp-disable:ip`,
    points: 5,
    duration: 900 // 15 minutes
  })

  if (!rateLimitResult.allowed) {
    logger.warn('2FA disable rate limit exceeded')
    throwRateLimitError(rateLimitResult)
  }

  // Step 1: Verify password and get verification ID
  const verificationId = await getVerificationIdByPassword(event, password)

  // Step 2: List current MFA factors
  const mfaList = await logtoProxy<LogtoMfaFactor[]>(event, '/mfa-verifications', {
    method: 'GET'
  })

  const totp = mfaList.find(m => m.type === 'Totp')

  if (!totp) {
    throw createApiError(404, {
      errorType: 'mfa',
      code: 'totp_not_found',
      message: 'TOTP factor not found'
    })
  }

  // Step 3: Delete the specific factor with verification header
  const result = await logtoProxy(event, `/mfa-verifications/${totp.id}`, {
    method: 'DELETE',
    verificationId
  })

  logger.info('TOTP factor deleted successfully')
  return result
})
