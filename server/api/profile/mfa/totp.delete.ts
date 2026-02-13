import type { H3Event } from 'h3'
import { createLogger, logError } from '../../../utils/logger'

const logger = createLogger('totp-delete')

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

/**
 * Get a verification record ID by verifying the user's password.
 * This is required for sensitive operations like deleting MFA.
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
    logError(logger, error, 'Password verification failed', {
      status: error.response?.status
    })
    throw createError({
      statusCode: error.response?.status || 500,
      message: error.response?._data?.message || 'Password verification failed',
      data: error.response?._data
    })
  }
}

const proxyLogto = async (event: H3Event, path: string, options: Record<string, unknown> = {}, verificationId?: string) => {
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

    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }

    // Add verification header if provided (required for sensitive operations)
    if (verificationId) {
      headers['logto-verification-id'] = verificationId
    }

    return await $fetch(`${apiBase}${path}`, {
      ...options,
      headers
    })
  } catch (e: unknown) {
    const error = e as LogtoErrorResponse
    logError(logger, error, 'Logto API proxy error', {
      path,
      status: error.response?.status,
      code: error.response?._data?.code
    })
    throw createError({
      statusCode: error.response?.status || 500,
      message: error.response?._data?.message || error.message || 'Failed to communicate with Logto',
      data: error.response?._data
    })
  }
}

export default defineEventHandler(async (event) => {
  // Read password from request body
  const body = await readBody<{ password?: string }>(event).catch(() => ({ password: undefined }))
  const { password } = body

  if (!password) {
    throw createError({
      statusCode: 400,
      message: 'Password is required to disable 2FA',
      data: { code: 'password_required' }
    })
  }

  try {
    // Step 1: Verify password and get verification ID
    const verificationId = await getVerificationIdByPassword(event, password)
    logger.debug('Got verification ID for TOTP deletion')

    // Step 2: List current MFA factors
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

    // Step 3: Delete the specific factor with verification header
    const result = await proxyLogto(event, `/mfa-verifications/${totp.id}`, {
      method: 'DELETE'
    }, verificationId)

    logger.info('TOTP factor deleted successfully')
    return result
  } catch (e: unknown) {
    const error = e as LogtoErrorResponse & { statusCode?: number }
    logError(logger, error, 'Disable 2FA error', {
      status: error.statusCode || error.response?.status
    })
    throw createError({
      statusCode: error.statusCode || error.response?.status || 500,
      message: error.message || 'Failed to disable TOTP',
      data: error.response?._data || { code: 'disable_failed' }
    })
  }
})
