import { computed } from 'vue'
import type { UserInfoResponse } from '@logto/nuxt'
import type { UserCustomData } from '#shared/types/user-custom-data'

/**
 * useAuthSession composable
 *
 * Wrapper around Logto's useLogtoUser for consistent auth session management.
 * Provides a familiar interface for accessing authenticated user data.
 *
 * Usage:
 * ```ts
 * const { isAuthenticated, session } = useAuthSession()
 * ```
 */

/**
 * Logto user interface with claims
 * Extends the official UserInfoResponse type from Logto
 */
export interface LogtoUser extends UserInfoResponse {
  custom_data?: UserCustomData
}

/**
 * Session object
 */
export interface AuthSession {
  user: LogtoUser
}

/**
 * Get the current authentication state from Logto.
 *
 * This composable wraps Logto's useLogtoUser to provide a consistent
 * interface for authentication state management.
 *
 * @returns Object containing authentication status and session
 */
export function useAuthSession() {
  // Get user from Logto - returns UserInfoResponse | undefined
  const user = useLogtoUser() as LogtoUser | undefined

  // Authentication status
  const isAuthenticated = computed<boolean>(() => Boolean(user))

  // Session object
  const session = computed<AuthSession | null>(() => {
    return user ? { user } : null
  })

  return {
    isAuthenticated,
    session
  }
}
