import type { LogtoUser } from '../../types/logto'
import { createLogger, logError } from '../../utils/logger'
import {
  getVerificationIdByPassword,
  getLogtoEndpoint,
  createApiError,
  getErrorStatus
} from '../../utils/logto-proxy'

const logger = createLogger('account-delete')

/**
 * Get M2M access token for Management API using dedicated credentials for user deletion.
 */
const getM2MToken = async (): Promise<string> => {
  const logtoEndpoint = getLogtoEndpoint()
  const clientId = process.env.LOGTO_M2M_DELETE_USER_CLIENT_ID
  const clientSecret = process.env.LOGTO_M2M_DELETE_USER_CLIENT_SECRET
  // For Logto OSS (self-hosted), the Management API indicator is always:
  // https://default.logto.app/api
  // This is NOT the same as the Logto endpoint - it's a fixed identifier
  const managementApiResource = 'https://default.logto.app/api'

  if (!clientId || !clientSecret) {
    logger.error('M2M credentials for user deletion not configured')
    throw createApiError(500, {
      errorType: 'account',
      code: 'm2m_not_configured',
      message: 'M2M credentials for user deletion not configured'
    })
  }

  try {
    const response = await $fetch<{ access_token: string }>(`${logtoEndpoint}/oidc/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        resource: managementApiResource,
        scope: 'all'
      }).toString()
    })

    return response.access_token
  } catch (error: unknown) {
    logError(logger, error, 'Failed to get M2M token')
    throw createApiError(500, {
      errorType: 'account',
      code: 'm2m_auth_failed',
      message: 'Failed to authenticate with Logto Management API'
    })
  }
}

export default defineEventHandler(async (event) => {
  // Get user ID from logtoUser context (injected by @logto/nuxt)
  const logtoUser = event.context.logtoUser as LogtoUser | undefined
  const userId = logtoUser?.sub

  if (!userId) {
    throw createApiError(401, {
      errorType: 'authentication',
      code: 'user_not_found',
      message: 'User ID not found in session'
    })
  }

  // Read password from request body
  const body = await readBody<{ password?: string }>(event).catch(() => ({ password: undefined }))
  const { password } = body

  if (!password) {
    throw createApiError(400, {
      errorType: 'validation',
      code: 'password_required',
      message: 'Password is required to delete account'
    })
  }

  try {
    // Step 1: Verify password to ensure user consent
    await getVerificationIdByPassword(event, password)

    // Step 2: Get M2M token for Management API
    const m2mToken = await getM2MToken()

    // Step 3: Delete user via Management API
    const logtoEndpoint = getLogtoEndpoint()
    await $fetch(`${logtoEndpoint}/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${m2mToken}`,
        'Content-Type': 'application/json'
      }
    })

    logger.info({ userId }, 'User account deleted')

    return {
      success: true,
      message: 'Account deleted successfully'
    }
  } catch (error: unknown) {
    const errorStatus = getErrorStatus(error)

    logError(logger, error, 'Account deletion error', {
      status: errorStatus
    })

    // Don't expose internal errors to client
    if (errorStatus === 401) {
      throw createApiError(401, {
        errorType: 'verification',
        code: 'invalid_password',
        message: 'Incorrect password'
      })
    }

    throw createApiError(errorStatus || 500, {
      errorType: 'account',
      code: 'deletion_failed',
      message: 'Failed to delete account'
    })
  }
})
