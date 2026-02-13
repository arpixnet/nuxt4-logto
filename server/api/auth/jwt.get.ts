/**
 * Get JWT Token for Hasura
 *
 * This endpoint returns an access token from Logto that can be used
 * to authenticate with Hasura GraphQL Engine or other API endpoints.
 *
 * The token contains standard JWT claims. For Hasura-specific claims,
 * configure them in Logto's JWT claims settings and use the access token
 * for the configured resource.
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

import { authLogger, logError } from '#utils/logger'

export default defineEventHandler(async (event) => {
  // Logto client is initialized by server/middleware/api-auth.ts
  const client = event.context.logtoClient as unknown as {
    getIdToken: () => Promise<string | null>
    getContext: (params?: { getAccessToken?: boolean, fetchUserInfo?: boolean }) => Promise<{
      isAuthenticated: boolean
      claims?: unknown
      accessToken?: string
      userInfo?: unknown
    }>
  }

  if (!client) {
    authLogger.error('Logto client not available')
    throw createError({
      statusCode: 500,
      statusMessage: 'Logto client not available'
    })
  }

  try {
    // Get the ID token directly from Logto client
    const token = await client.getIdToken()

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

    // Decode JWT to get expiration time
    const parts = token.split('.')
    if (parts.length !== 3) {
      authLogger.error({ partsLength: parts.length }, 'Invalid token format')
      throw new Error('Invalid token format')
    }

    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString('utf-8'))

    return {
      token,
      user: context.userInfo,
      expiresAt: payload.exp
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
