/**
 * Get JWT Token for Hasura
 *
 * This endpoint returns to ID token from Logto that can be used
 * to authenticate with Hasura GraphQL Engine.
 *
 * The JWT contains Hasura-specific claims that are configured in
 * Logto's JWT claims settings.
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

interface JWTClaims {
  exp?: number
  iat?: number
  iss?: string
  sub?: string
  aud?: string | string[]
  [key: string]: unknown
}

export default defineEventHandler(async (event) => {
  // Logto client is initialized by server/middleware/api-auth.ts
  const client = event.context.logtoClient

  if (!client) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Logto client not available'
    })
  }

  // Check if user is authenticated
  const authenticated = await client.isAuthenticated()

  if (!authenticated) {
    throw createError({
      statusCode: 401,
      statusMessage: 'User not authenticated'
    })
  }

  try {
    // Get ID token which contains Hasura claims
    const idToken = await client.getIdToken()

    // You can also get user info if needed
    const userInfo = await client.fetchUserInfo()

    return {
      token: idToken,
      user: userInfo,
      // The ID token expires at this time (Unix timestamp)
      expiresAt: await client.getAccessTokenClaims().then((claims: JWTClaims) => claims?.exp)
    }
  } catch (error) {
    console.error('Error getting JWT token:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get JWT token'
    })
  }
})
