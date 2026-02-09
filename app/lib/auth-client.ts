/**
 * Auth Client Composable
 *
 * Provides access to authentication tokens from Logto.
 * This composable uses the server-side Logto client when available (SSR),
 * otherwise falls back to client-side token fetching.
 *
 * Usage:
 * ```ts
 * const authClient = useAuthClient()
 * const { data, error } = await authClient.token()
 * ```
 */

export interface TokenResponse {
  token: string
  user?: unknown
  expiresAt?: number
}

export interface TokenResult {
  data?: TokenResponse
  error?: Error | null
}

/**
 * Auth client composable for token operations
 */
export function useAuthClient() {
  /**
   * Get JWT token from server
   * This calls the /api/auth/jwt endpoint which validates the session
   * and returns the ID token from Logto
   *
   * IMPORTANT: credentials: 'include' is required to send session cookies
   */
  const token = async (): Promise<TokenResult> => {
    try {
      // Use $fetch with include credentials for cookie handling
      const data = await $fetch<TokenResponse>('/api/auth/jwt', {
        credentials: 'include'
      })

      if (!data || !data.token) {
        return {
          data: undefined,
          error: new Error('No token returned from server')
        }
      }

      return {
        data,
        error: null
      }
    } catch (error) {
      return {
        data: undefined,
        error: error instanceof Error ? error : new Error(String(error))
      }
    }
  }

  return {
    token
  }
}
