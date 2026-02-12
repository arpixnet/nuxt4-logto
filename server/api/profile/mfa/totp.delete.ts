import type { H3Event } from 'h3'

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
  statusCode?: number
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

export default defineEventHandler(async (event) => {
  try {
    // List current MFA factors using the correct Account API path
    const mfaList = await proxyLogto(event, '/mfa-verifications', {
      method: 'GET'
    }) as LogtoMfaFactor[]

    const totp = mfaList.find(m => m.type === 'Totp')

    if (!totp) {
      throw createError({
        statusCode: 404,
        message: 'TOTP factor not found'
      })
    }

    // Delete the specific factor
    return await proxyLogto(event, `/mfa-verifications/${totp.id}`, {
      method: 'DELETE'
    })
  } catch (e: unknown) {
    const error = e as LogtoErrorResponse & { statusCode?: number }
    console.error('Disable 2FA error:', {
      status: error.statusCode || error.response?.status,
      message: error.message
    })
    throw createError({
      statusCode: error.statusCode || error.response?.status || 500,
      message: error.message || 'Failed to disable TOTP'
    })
  }
})
