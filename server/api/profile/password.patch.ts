import type { H3Event } from 'h3'

/**
 * Password change flow for Logto Account API:
 * 1. Verify current password via POST /api/verifications/password
 * 2. Use the verificationRecordId as logto-verification-id header
 * 3. POST /api/my-account/password with the new password
 *
 * Errors are forwarded with { errorType, code, subCodes } so the client
 * can display specific i18n messages.
 */

interface LogtoErrorData {
  code?: string
  message?: string
  data?: Array<{ code?: string }>
}

interface LogtoClient {
  getAccessToken: () => Promise<string>
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'CONNECT' | 'TRACE'

interface FetchOptions {
  method?: HttpMethod
  body?: string
  headers?: Record<string, string>
}

const logtoFetch = async (event: H3Event, path: string, options: FetchOptions = {}) => {
  const client = event.context.logtoClient as LogtoClient | undefined
  if (!client) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized: Logto client not available'
    })
  }

  const accessToken = await client.getAccessToken()
  const logtoEndpoint = process.env.NUXT_LOGTO_ENDPOINT || 'http://localhost:3001'

  return await $fetch(`${logtoEndpoint}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })
}

/**
 * Normalize a Logto error code for i18n lookup.
 * Replaces dots with underscores so vue-i18n doesn't interpret them as nested paths.
 * e.g. "password.rejected" -> "password__rejected"
 *      "password_rejected.pwned" -> "password_rejected__pwned"
 */
function normalizeCode(code: string): string {
  return code.replace(/\./g, '__')
}

/**
 * Extract error code from unknown error
 */
function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: LogtoErrorData }).data
    return data?.code
  }
  return undefined
}

/**
 * Extract error message from unknown error
 */
function getErrorMessage(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    if ('data' in error) {
      const data = (error as { data?: LogtoErrorData }).data
      if (data?.message) return data.message
    }
    if ('message' in error) {
      return (error as Error).message
    }
  }
  return undefined
}

/**
 * Extract error data array from unknown error
 */
function getErrorSubCodes(error: unknown): string[] {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: LogtoErrorData }).data
    if (data?.data) {
      return data.data
        .map(d => d?.code ? normalizeCode(d.code) : null)
        .filter((code): code is string => code !== null)
    }
  }
  return []
}

/**
 * Extract status code from unknown error
 */
function getErrorStatus(error: unknown): number {
  if (error && typeof error === 'object') {
    if ('response' in error) {
      const response = (error as { response?: { status?: number } }).response
      if (response?.status) return response.status
    }
    if ('statusCode' in error) {
      const statusCode = (error as { statusCode?: number }).statusCode
      if (statusCode) return statusCode
    }
  }
  return 500
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { currentPassword, password } = body

  if (!password) {
    throw createError({
      statusCode: 400,
      data: { errorType: 'validation', code: 'missing_password' },
      message: 'New password is required'
    })
  }

  // Step 1: Verify current password
  let verificationId: string | undefined
  if (currentPassword) {
    try {
      const verifyResult = await logtoFetch(event, '/api/verifications/password', {
        method: 'POST',
        body: JSON.stringify({ password: currentPassword })
      }) as { verificationRecordId?: string } | undefined
      verificationId = verifyResult?.verificationRecordId
    } catch (error: unknown) {
      console.error('Verification error:', error)
      // This means the current password is wrong
      throw createError({
        statusCode: 422,
        data: {
          errorType: 'verification',
          code: normalizeCode(getErrorCode(error) || 'session__verification_failed')
        },
        message: 'Current password is incorrect'
      })
    }
  }

  // Step 2: Update password with verification
  try {
    const headers: Record<string, string> = {}
    if (verificationId) {
      headers['logto-verification-id'] = verificationId
    }

    await logtoFetch(event, '/api/my-account/password', {
      method: 'POST',
      headers,
      body: JSON.stringify({ password })
    })

    return { success: true }
  } catch (error: unknown) {
    console.error('Password update error:', error)

    // Extract Logto error code and sub-codes, normalize for i18n
    const logtoCode = normalizeCode(getErrorCode(error) || 'unknown')
    const logtoSubCodes = getErrorSubCodes(error)

    throw createError({
      statusCode: getErrorStatus(error),
      data: {
        errorType: 'password_update',
        code: logtoCode,
        subCodes: logtoSubCodes
      },
      message: getErrorMessage(error) || 'Failed to change password'
    })
  }
})
