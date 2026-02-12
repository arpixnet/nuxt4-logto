import type { H3Event } from 'h3'

interface LogtoTotpSecretResponse {
  secret: string
  secretQrCode?: string
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

const proxyLogto = async (event: H3Event, path: string, options: Record<string, unknown> = {}) => {
  const client = event.context.logtoClient as { getAccessToken: () => Promise<string> } | undefined
  if (!client) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized: Logto client not available'
    })
  }

  try {
    const accessToken = await client.getAccessToken()
    const logtoEndpoint = process.env.NUXT_LOGTO_ENDPOINT || 'http://localhost:3001'
    const apiBase = `${logtoEndpoint}/api/my-account`

    return await $fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        ...options.headers as Record<string, string>,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
  } catch (e: unknown) {
    const error = e as LogtoErrorResponse
    console.error('Logto API proxy error:', {
      path,
      status: error.response?.status,
      data: error.response?._data,
      message: error.message
    })
    throw createError({
      statusCode: error.response?.status || 500,
      message: error.response?._data?.message || error.message || 'Failed to communicate with Logto',
      data: error.response?._data
    })
  }
}

/**
 * Build an otpauth:// URI for TOTP setup when Logto doesn't provide the QR code.
 * Format: otpauth://totp/{issuer}:{account}?secret={secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30
 */
const buildOtpAuthUri = (secret: string, email: string, issuer: string = 'NuxtApp'): string => {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedAccount = encodeURIComponent(email)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30'
  })
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?${params.toString()}`
}

export default defineEventHandler(async (event) => {
  // Get user info from session to build otpauth URI if needed
  const session = event.context.session as { user?: { email?: string } } | undefined
  const userEmail = session?.user?.email || 'user@example.com'

  // Note: Skipping the GET /mfa-verifications check since it requires 'identity' scope
  // which may not be available. The generate endpoint works without it.
  // If there's an existing unverified secret, Logto will return it instead of creating a new one.

  // Step 1: Generate TOTP secret using Logto's my-account API
  // This endpoint generates a new TOTP secret and QR code for the user to scan
  // Path: /api/my-account/mfa-verifications/totp-secret/generate
  const result = await proxyLogto(event, '/mfa-verifications/totp-secret/generate', {
    method: 'POST'
  }) as LogtoTotpSecretResponse

  // Debug: Log the full response to see what Logto returns
  console.log('Logto TOTP secret response:', JSON.stringify(result, null, 2))

  // If Logto provides the QR code URI, use it directly
  // Otherwise, build the otpauth:// URI ourselves from the secret
  let qrCodeUri = result.secretQrCode

  if (!qrCodeUri && result.secret) {
    // Logto didn't provide QR code (e.g., when secret already exists but not verified)
    // Build the otpauth:// URI ourselves so VueQrcode can generate the QR
    qrCodeUri = buildOtpAuthUri(result.secret, userEmail)
    console.log('Generated otpauth URI from secret:', qrCodeUri.substring(0, 50) + '...')
  }

  const response = {
    secret: result.secret,
    qrCodeUri,
    verificationId: result.verificationId
  }

  // Debug: Log what we're returning to the frontend
  console.log('TOTP setup response to frontend:', {
    hasSecret: !!response.secret,
    secretLength: response.secret?.length,
    hasQrCodeUri: !!response.qrCodeUri,
    qrCodeUriPreview: response.qrCodeUri?.substring(0, 30) + '...',
    hasVerificationId: !!response.verificationId
  })

  return response
})
