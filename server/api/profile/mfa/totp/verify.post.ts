import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib'
import { createLogger } from '../../../../utils/logger'
import {
  getVerificationIdByPassword,
  getLogtoClient,
  getLogtoEndpoint,
  createApiError,
  getErrorStatus,
  getErrorCode
} from '../../../../utils/logto-proxy'

const logger = createLogger('totp-verify')

interface TotpVerifyBody {
  code: string
  secret: string
  verificationId?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<TotpVerifyBody>(event)
  const { code, secret, verificationId, password } = body

  if (!code) {
    throw createApiError(400, {
      errorType: 'validation',
      code: 'missing_code',
      message: 'Missing verification code'
    })
  }

  let effectiveVerificationId = verificationId

  // If no verificationId provided but we have password, get verificationId from password verification
  if (!effectiveVerificationId && password) {
    effectiveVerificationId = await getVerificationIdByPassword(event, password)
  }

  // Try to bind TOTP with verificationId using my-account API with user's access token
  // This requires the 'identity' scope which is requested in nuxt.config.ts
  if (effectiveVerificationId && secret) {
    try {
      const client = getLogtoClient(event)
      const accessToken = await client.getAccessToken()
      const logtoEndpoint = getLogtoEndpoint()

      // Bind TOTP using my-account API with verification header
      const result = await $fetch(`${logtoEndpoint}/api/my-account/mfa-verifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'logto-verification-id': effectiveVerificationId
        },
        body: { type: 'Totp', secret }
      })

      logger.info('TOTP bound successfully via my-account API')
      return result
    } catch (error: unknown) {
      const errorStatus = getErrorStatus(error)
      const errorCode = getErrorCode(error)

      logger.error({
        status: errorStatus,
        code: errorCode
      }, 'Bind endpoint failed')

      // If 401, fallback to local TOTP verification
      // This happens when the access token doesn't have 'identity' scope
      if (errorStatus === 401) {
        logger.warn('Falling back to local TOTP verification (identity scope may be missing)')

        // Verify the TOTP code locally using otplib with crypto plugins
        // Use a wider time window (±1 step) to account for clock drift
        const totp = new TOTP({
          secret,
          crypto: new NobleCryptoPlugin(),
          base32: new ScureBase32Plugin()
        })

        // Try current time step and adjacent ones for clock drift
        const currentTime = Math.floor(Date.now() / 1000)
        const timeSteps = [0, -1, 1] // Current, previous, next 30-second window
        let isValid = false

        for (const delta of timeSteps) {
          const epoch = currentTime + (delta * 30)
          try {
            const result = await totp.verify(code, { epoch })
            if (result.valid) {
              isValid = true
              break
            }
          } catch {
            // Continue to next time step
          }
        }

        if (isValid) {
          // Code is valid - user has correctly scanned the QR
          // Note: This doesn't bind TOTP in Logto, but verifies the user set up their app correctly
          // For full Logto integration, the 'identity' scope must be enabled in Logto Console
          logger.warn('TOTP code verified locally only - not bound in Logto')
          return {
            success: true,
            verified: true,
            warning: 'TOTP verified locally but not bound in Logto. Enable identity scope in Logto Console for full integration.'
          }
        }

        throw createApiError(400, {
          errorType: 'mfa',
          code: 'invalid_totp_code',
          message: 'Invalid TOTP code. Please try again.'
        })
      }

      throw createApiError(errorStatus, {
        errorType: 'mfa',
        code: errorCode || 'bind_failed',
        message: 'Failed to bind TOTP'
      })
    }
  }

  // No verificationId and no password - we need one or the other
  throw createApiError(400, {
    errorType: 'validation',
    code: 'verification_required',
    message: 'verificationId or password is required to complete TOTP setup'
  })
})
