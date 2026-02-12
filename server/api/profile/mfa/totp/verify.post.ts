import type { H3Event } from 'h3'
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib'

interface TotpVerifyBody {
  code: string
  secret: string
  verificationId?: string
}

interface LogtoErrorResponse {
  response?: {
    status?: number
    _data?: {
      code?: string
      message?: string
    }
  }
  message?: string
}

/**
 * Get a verification record ID by verifying the user's password.
 * This is required for sensitive operations like binding MFA.
 */
const getVerificationIdByPassword = async (event: H3Event, password: string): Promise<string> => {
  const client = event.context.logtoClient as { getAccessToken: () => Promise<string> } | undefined
  if (!client) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized: Logto client not available'
    })
  }

  const accessToken = await client.getAccessToken()
  const logtoEndpoint = process.env.NUXT_LOGTO_ENDPOINT || 'http://localhost:3001'

  try {
    const result = await $fetch(`${logtoEndpoint}/api/verifications/password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: { password }
    })

    console.log('Password verification response:', JSON.stringify(result, null, 2))

    // Logto returns the verification record ID as 'verificationRecordId'
    const typedResult = result as Record<string, unknown>
    const verificationId = typedResult.verificationRecordId as string | undefined

    if (!verificationId) {
      console.error('No verificationId found in response. Available keys:', Object.keys(typedResult))
      throw createError({
        statusCode: 500,
        message: 'Password verification succeeded but no verification ID returned',
        data: { code: 'verification_id_missing' }
      })
    }

    return verificationId
  } catch (e: unknown) {
    const error = e as LogtoErrorResponse
    console.error('Password verification failed:', error.response?.status, error.response?._data)
    throw createError({
      statusCode: error.response?.status || 500,
      message: error.response?._data?.message || 'Password verification failed',
      data: error.response?._data
    })
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<TotpVerifyBody & { password?: string }>(event)
  const { code, secret, verificationId, password } = body

  console.log('TOTP verify request received:', {
    hasCode: !!code,
    codeLength: code?.length,
    hasSecret: !!secret,
    secretLength: secret?.length,
    secretPreview: secret?.substring(0, 5) + '...' + secret?.substring(secret.length - 3),
    hasVerificationId: !!verificationId,
    hasPassword: !!password
  })

  if (!code) {
    throw createError({
      statusCode: 400,
      message: 'Missing verification code'
    })
  }

  let effectiveVerificationId = verificationId

  // If no verificationId provided but we have password, get verificationId from password verification
  if (!effectiveVerificationId && password) {
    effectiveVerificationId = await getVerificationIdByPassword(event, password)
    console.log('Got verificationId from password verification:', effectiveVerificationId?.substring(0, 20))
  }

  console.log('After password verification:', {
    effectiveVerificationId: effectiveVerificationId?.substring(0, 20),
    secret: secret?.substring(0, 10),
    code: code?.substring(0, 3)
  })

  // Try to bind TOTP with verificationId using my-account API with user's access token
  // This requires the 'identity' scope which is requested in nuxt.config.ts
  if (effectiveVerificationId && secret) {
    try {
      console.log('Attempting to bind TOTP via my-account API:', {
        hasVerificationId: !!effectiveVerificationId,
        hasSecret: !!secret,
        hasCode: !!code
      })

      const client = event.context.logtoClient as { getAccessToken: () => Promise<string> } | undefined
      if (!client) {
        throw createError({
          statusCode: 401,
          message: 'Unauthorized: Logto client not available'
        })
      }

      const accessToken = await client.getAccessToken()
      const logtoEndpoint = process.env.NUXT_LOGTO_ENDPOINT || 'http://localhost:3001'

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

      console.log('TOTP bind successful via my-account API:', JSON.stringify(result))
      return result
    } catch (e: unknown) {
      const error = e as LogtoErrorResponse
      console.error('Bind endpoint failed:', error.response?.status, error.response?._data)

      // If 401, fallback to local TOTP verification
      // This happens when the access token doesn't have 'identity' scope
      if (error.response?.status === 401) {
        console.log('Falling back to local TOTP verification')

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
            console.log(`TOTP verify attempt (delta=${delta}):`, result)
            if (result.valid) {
              isValid = true
              break
            }
          } catch (e) {
            console.log(`TOTP verify error (delta=${delta}):`, e)
          }
        }

        console.log('Local TOTP verification result:', isValid)

        if (isValid) {
          // Code is valid - user has correctly scanned the QR
          // Note: This doesn't bind TOTP in Logto, but verifies the user set up their app correctly
          // For full Logto integration, the 'identity' scope must be enabled in Logto Console
          console.log('TOTP code verified successfully (local verification only)')
          return {
            success: true,
            verified: true,
            warning: 'TOTP verified locally but not bound in Logto. Enable identity scope in Logto Console for full integration.'
          }
        }

        throw createError({
          statusCode: 400,
          message: 'Invalid TOTP code. Please try again.',
          data: { code: 'invalid_totp_code' }
        })
      }

      throw createError({
        statusCode: error.response?.status || 500,
        message: error.response?._data?.message || 'Failed to bind TOTP',
        data: error.response?._data
      })
    }
  }

  // No verificationId and no password - we need one or the other
  throw createError({
    statusCode: 400,
    message: 'verificationId or password is required to complete TOTP setup',
    data: { code: 'verification_required' }
  })
})
