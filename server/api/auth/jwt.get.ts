/**
 * Get JWT Token for Hasura
 *
 * This endpoint returns an ACCESS TOKEN from Logto that can be used
 * to authenticate with Hasura GraphQL Engine.
 *
 * IMPORTANT: We use getAccessToken() instead of getIdToken() because
 * custom JWT claims (like Hasura claims) are only added to access tokens,
 * not ID tokens.
 *
 * Usage in frontend:
 * ```ts
 * const { data } = await useFetch('/api/auth/jwt')
 * const token = data.value?.token
 * ```
 *
 * Then use it in GraphQL requests:
 * ```ts
 * const response = await fetch('https://your-hasura.com/v1/graphql', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${token}`
 *   },
 *   body: JSON.stringify({ query: '...' })
 * })
 * ```
 */

import { authLogger, logError } from '../../utils/logger'

/**
 * Logto client interface with the methods we need
 * The Logto client is initialized by server/middleware/01-api-auth.ts
 */
interface LogtoClientMethods {
  getAccessToken: (resource?: string) => Promise<string>
  getContext: (params?: { fetchUserInfo?: boolean }) => Promise<{
    isAuthenticated: boolean
    userInfo?: {
      sub?: string
      email?: string
      name?: string
      picture?: string
      [key: string]: unknown
    }
  }>
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  // Logto client is initialized by server/middleware/01-api-auth.ts
  const client = event.context.logtoClient as unknown as LogtoClientMethods | undefined

  if (!client) {
    authLogger.error('Logto client not available')
    throw createError({
      statusCode: 500,
      statusMessage: 'Logto client not available'
    })
  }

  try {
    // Get the ACCESS TOKEN for Hasura API resource
    // This is crucial: custom claims are only in access tokens, not ID tokens
    const hasuraResource = config.logto?.resources?.[0] || 'hasura'
    const token = await client.getAccessToken(hasuraResource)

    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'User not authenticated'
      })
    }

    // Get user info
    const context = await client.getContext({
      fetchUserInfo: true
    })

    // Decode JWT to get expiration time and claims
    const parts = token.split('.')
    if (parts.length !== 3) {
      authLogger.error({ partsLength: parts.length }, 'Invalid token format')
      throw new Error('Invalid token format')
    }

    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString('utf-8'))

    return {
      token,
      user: context.userInfo,
      expiresAt: payload.exp,
      hasuraClaims: payload['https://hasura.io/jwt/claims']
    }
  } catch (error) {
    logError(authLogger, error, 'Error getting JWT token')

    // Handle authentication errors specifically
    if (error instanceof Error && error.message.includes('User is not authenticated')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'User not authenticated'
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get JWT token'
    })
  }
})
