interface LogtoMfaFactor {
  id: string
  type: 'Totp' | 'BackupCode' | 'WebAuthn'
  createdAt?: number
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

export default defineEventHandler(async (event) => {
  // Get the Logto client from context (injected by @logto/nuxt)
  const client = event.context.logtoClient as { getAccessToken: () => Promise<string> } | undefined

  if (!client) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized: Logto client not available'
    })
  }

  const logtoEndpoint = process.env.NUXT_LOGTO_ENDPOINT || 'http://localhost:3001'

  try {
    // Get the user's access token
    const accessToken = await client.getAccessToken()

    // Use my-account API to get MFA verifications
    // This endpoint works with the user's access token and doesn't require M2M credentials
    const response = await $fetch(`${logtoEndpoint}/api/my-account/mfa-verifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('MFA status response from my-account API:', JSON.stringify(response, null, 2))

    // Handle both response formats: direct array or { data: array }
    let mfaFactors: LogtoMfaFactor[] = []
    if (Array.isArray(response)) {
      mfaFactors = response
    } else if (response && typeof response === 'object' && 'data' in response && Array.isArray((response as { data: unknown }).data)) {
      mfaFactors = (response as { data: LogtoMfaFactor[] }).data
    }

    // Check if user has TOTP enabled
    const hasTotp = mfaFactors.some(mfa => mfa.type === 'Totp')

    return {
      enabled: hasTotp,
      factors: mfaFactors.map(mfa => mfa.type)
    }
  } catch (e: unknown) {
    const error = e as LogtoErrorResponse
    console.error('Failed to fetch MFA status:', error.response?.status, error.response?._data)
    throw createError({
      statusCode: error.response?.status || 500,
      message: error.response?._data?.message || 'Failed to fetch MFA status',
      data: error.response?._data
    })
  }
})
