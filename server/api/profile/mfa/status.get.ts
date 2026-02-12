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
  // Get user ID from session
  const session = event.context.session as { user?: { sub?: string } } | undefined
  const userId = session?.user?.sub

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'User ID not found in session'
    })
  }

  const logtoEndpoint = process.env.NUXT_LOGTO_ENDPOINT || 'http://localhost:3001'
  const managementApiResource = `${logtoEndpoint}/api`

  try {
    // Get M2M access token for Management API (more reliable than my-account API which requires identity scope)
    const m2mTokenResponse = await $fetch(`${logtoEndpoint}/oidc/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.NUXT_LOGTO_CLIENT_ID || '',
        client_secret: process.env.NUXT_LOGTO_CLIENT_SECRET || '',
        resource: managementApiResource,
        scope: 'all'
      }).toString()
    }) as { access_token: string }

    // Get user's MFA verifications from Management API
    const userMfa = await $fetch(`${logtoEndpoint}/api/users/${userId}/mfa-verifications`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${m2mTokenResponse.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('MFA status response from Management API:', JSON.stringify(userMfa, null, 2))

    const mfaData = userMfa as { data?: Array<{ type: string, id: string }> }
    const hasTotp = mfaData.data?.some(mfa => mfa.type === 'Totp') ?? false

    return {
      enabled: hasTotp,
      factors: mfaData.data?.map(mfa => mfa.type) ?? []
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
