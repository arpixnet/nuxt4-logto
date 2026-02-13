import type { H3Event } from 'h3'
import type {
  LogtoAccountClient,
  LogtoErrorResponse,
  LogtoErrorData,
  LogtoProxyOptions,
  ApiErrorResponse
} from '../types/logto'
import { createLogger, logError } from './logger'

const logger = createLogger('logto-proxy')

/**
 * Normalize a Logto error code for i18n lookup.
 * Replaces dots with underscores so vue-i18n doesn't interpret them as nested paths.
 * e.g. "password.rejected" -> "password__rejected"
 *      "password_rejected.pwned" -> "password_rejected__pwned"
 */
export function normalizeCode(code: string): string {
  return code.replace(/\./g, '__')
}

/**
 * Extract error code from unknown error
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    if ('data' in error) {
      const data = (error as { data?: LogtoErrorData }).data
      return data?.code
    }
    if ('response' in error) {
      const response = (error as LogtoErrorResponse).response
      return response?._data?.code
    }
  }
  return undefined
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    if ('data' in error) {
      const data = (error as { data?: LogtoErrorData }).data
      if (data?.message) return data.message
    }
    if ('response' in error) {
      const response = (error as LogtoErrorResponse).response
      if (response?._data?.message) return response._data.message
    }
    if ('message' in error) {
      return (error as Error).message
    }
  }
  return undefined
}

/**
 * Extract error data array (subCodes) from unknown error
 */
export function getErrorSubCodes(error: unknown): string[] {
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
export function getErrorStatus(error: unknown): number {
  if (error && typeof error === 'object') {
    if ('statusCode' in error) {
      const statusCode = (error as { statusCode?: number }).statusCode
      if (statusCode) return statusCode
    }
    if ('response' in error) {
      const response = (error as LogtoErrorResponse).response
      if (response?.status) return response.status
    }
  }
  return 500
}

/**
 * Create a standardized API error response
 */
export function createApiError(
  statusCode: number,
  options: ApiErrorResponse
): Error {
  return createError({
    statusCode,
    data: {
      errorType: options.errorType,
      code: options.code,
      subCodes: options.subCodes
    },
    message: options.message
  })
}

/**
 * Handle Logto API errors consistently
 */
export function handleLogtoError(
  error: unknown,
  context: string,
  errorType: ApiErrorResponse['errorType'] = 'proxy'
): never {
  const logtoError = error as LogtoErrorResponse
  const statusCode = getErrorStatus(error)
  const code = normalizeCode(getErrorCode(error) || 'unknown')
  const message = getErrorMessage(error) || `Failed to ${context}`
  const subCodes = getErrorSubCodes(error)

  logError(logger, error, `Logto API error: ${context}`, {
    status: statusCode,
    code,
    subCodes
  })

  throw createApiError(statusCode, {
    errorType,
    code,
    message,
    subCodes: subCodes.length > 0 ? subCodes : undefined
  })
}

/**
 * Get the Logto client from event context with type safety
 */
export function getLogtoClient(event: H3Event): LogtoAccountClient {
  const client = event.context.logtoClient as LogtoAccountClient | undefined

  if (!client) {
    throw createApiError(401, {
      errorType: 'authentication',
      code: 'unauthorized',
      message: 'Unauthorized: Logto client not available'
    })
  }

  return client
}

/**
 * Get the Logto API base URL
 */
export function getLogtoEndpoint(): string {
  return process.env.NUXT_LOGTO_ENDPOINT || 'http://localhost:3001'
}

/**
 * Proxy requests to Logto API with consistent error handling
 */
export async function logtoProxy<T = unknown>(
  event: H3Event,
  path: string,
  options: LogtoProxyOptions = {}
): Promise<T> {
  const client = getLogtoClient(event)
  const logtoEndpoint = getLogtoEndpoint()

  const apiBaseMap = {
    'my-account': '/api/my-account',
    'verifications': '/api/verifications'
  }
  const apiBase = apiBaseMap[options.apiBase || 'my-account']

  try {
    const accessToken = await client.getAccessToken()

    const headers: Record<string, string> = {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }

    if (options.verificationId) {
      headers['logto-verification-id'] = options.verificationId
    }

    const body = typeof options.body === 'string'
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined

    const response = await $fetch(`${logtoEndpoint}${apiBase}${path}`, {
      method: options.method || 'GET',
      headers,
      body
    })
    return response as T
  } catch (error: unknown) {
    handleLogtoError(error, `proxy request to ${path}`, 'proxy')
  }
}

/**
 * Get a verification record ID by verifying the user's password.
 * This is required for sensitive operations like deleting MFA, account deletion, etc.
 */
export async function getVerificationIdByPassword(
  event: H3Event,
  password: string
): Promise<string> {
  const client = getLogtoClient(event)
  const logtoEndpoint = getLogtoEndpoint()

  try {
    const accessToken = await client.getAccessToken()

    const result = await $fetch<{ verificationRecordId?: string }>(
      `${logtoEndpoint}/api/verifications/password`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: { password }
      }
    )

    const verificationId = result?.verificationRecordId

    if (!verificationId) {
      throw createApiError(500, {
        errorType: 'verification',
        code: 'verification_id_missing',
        message: 'Password verification succeeded but no verification ID returned'
      })
    }

    return verificationId
  } catch (error: unknown) {
    // If it's already a createError, re-throw it
    if (error && typeof error === 'object' && '__nuxt_error' in error) {
      throw error
    }

    handleLogtoError(error, 'verify password', 'verification')
  }
}

/**
 * Build an otpauth:// URI for TOTP setup when Logto doesn't provide the QR code.
 * Format: otpauth://totp/{issuer}:{account}?secret={secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30
 */
export function buildOtpAuthUri(
  secret: string,
  email: string,
  issuer: string = 'NuxtApp'
): string {
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
