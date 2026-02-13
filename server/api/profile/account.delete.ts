import type { H3Event } from 'h3'

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
 * This is required for sensitive operations like account deletion.
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

    const typedResult = result as Record<string, unknown>
    const verificationId = typedResult.verificationRecordId as string | undefined

    if (!verificationId) {
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

/**
 * Get M2M access token for Management API using dedicated credentials for user deletion.
 */
const getM2MToken = async (): Promise<string> => {
  const logtoEndpoint = process.env.NUXT_LOGTO_ENDPOINT || 'http://localhost:3001'
  const clientId = process.env.LOGTO_M2M_DELETE_USER_CLIENT_ID
  const clientSecret = process.env.LOGTO_M2M_DELETE_USER_CLIENT_SECRET
  // For Logto OSS (self-hosted), the Management API indicator is always:
  // https://default.logto.app/api
  // This is NOT the same as the Logto endpoint - it's a fixed identifier
  const managementApiResource = 'https://default.logto.app/api'

  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 500,
      message: 'M2M credentials for user deletion not configured',
      data: { code: 'm2m_not_configured' }
    })
  }

  try {
    const response = await $fetch(`${logtoEndpoint}/oidc/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        resource: managementApiResource,
        scope: 'all'
      }).toString()
    }) as { access_token: string }

    return response.access_token
  } catch (e: unknown) {
    const error = e as LogtoErrorResponse
    console.error('Failed to get M2M token:', error.response?.status, error.response?._data)
    throw createError({
      statusCode: 500,
      message: 'Failed to authenticate with Logto Management API',
      data: { code: 'm2m_auth_failed' }
    })
  }
}

export default defineEventHandler(async (event) => {
  console.log('=== Delete Account Endpoint Called ===')

  // Get user ID from logtoUser context (injected by @logto/nuxt)
  const logtoUser = event.context.logtoUser as { sub?: string } | undefined
  const userId = logtoUser?.sub

  console.log('User ID:', userId)

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'User ID not found in session'
    })
  }

  // Read password from request body
  const body = await readBody<{ password?: string }>(event).catch(() => ({ password: undefined }))
  const { password } = body

  console.log('Password provided:', !!password)

  if (!password) {
    throw createError({
      statusCode: 400,
      message: 'Password is required to delete account',
      data: { code: 'password_required' }
    })
  }

  try {
    // Step 1: Verify password to ensure user consent
    console.log('Step 1: Verifying password...')
    await getVerificationIdByPassword(event, password)
    console.log('Password verified for account deletion')

    // Step 2: Get M2M token for Management API
    console.log('Step 2: Getting M2M token...')
    const m2mToken = await getM2MToken()
    console.log('M2M token obtained for user deletion')

    // Step 3: Delete user via Management API
    console.log('Step 3: Deleting user via Management API...')
    const logtoEndpoint = process.env.NUXT_LOGTO_ENDPOINT || 'http://localhost:3001'
    await $fetch(`${logtoEndpoint}/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${m2mToken}`,
        'Content-Type': 'application/json'
      }
    })

    console.log(`User account deleted: ${userId}`)

    return {
      success: true,
      message: 'Account deleted successfully'
    }
  } catch (e: unknown) {
    const error = e as LogtoErrorResponse & { statusCode?: number }
    console.error('Account deletion error:', {
      status: error.statusCode || error.response?.status,
      message: error.message,
      data: error.response?._data
    })

    // Don't expose internal errors to client
    if (error.response?.status === 401 || error.message?.includes('Password verification')) {
      throw createError({
        statusCode: 401,
        message: 'Incorrect password',
        data: { code: 'invalid_password' }
      })
    }

    throw createError({
      statusCode: error.statusCode || error.response?.status || 500,
      message: error.message || 'Failed to delete account',
      data: error.response?._data || { code: 'deletion_failed' }
    })
  }
})
