import { computed, ref } from 'vue'
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
 * const { isAuthenticated, session, updateAvatarUrl } = useAuthSession()
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

// Global override for avatar URL (used after upload without page refresh)
const avatarUrlOverride = ref<string | null>(null)

/**
 * Get the current authentication state from Logto.
 *
 * This composable wraps Logto's useLogtoUser to provide a consistent
 * interface for authentication state management.
 *
 * @returns Object containing authentication status, session, and update methods
 */
export function useAuthSession() {
  // Get user from Logto - returns UserInfoResponse | undefined
  const logtoUser = useLogtoUser() as LogtoUser | undefined

  // Authentication status
  const isAuthenticated = computed<boolean>(() => Boolean(logtoUser))

  // Session object with avatar override support
  const session = computed<AuthSession | null>(() => {
    if (!logtoUser) return null

    // If we have an avatar override, merge it into custom_data
    if (avatarUrlOverride.value) {
      return {
        user: {
          ...logtoUser,
          custom_data: {
            ...(logtoUser.custom_data || {}),
            avatarUrl: avatarUrlOverride.value
          }
        }
      }
    }

    return { user: logtoUser }
  })

  /**
   * Update avatar URL locally without page refresh.
   * Call this after successfully uploading a new avatar.
   */
  function updateAvatarUrl(url: string) {
    avatarUrlOverride.value = url
  }

  /**
   * Clear the avatar override (useful for logout or reset)
   */
  function clearAvatarOverride() {
    avatarUrlOverride.value = null
  }

  return {
    isAuthenticated,
    session,
    updateAvatarUrl,
    clearAvatarOverride
  }
}
