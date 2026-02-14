import { computed, reactive } from 'vue'
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
 * const { isAuthenticated, session, updateUserProfile, updateAvatar } = useAuthSession()
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
 * Profile data that can be updated locally
 */
interface ProfileOverride {
  name?: string
  username?: string
  phone_number?: string
  picture?: string
  custom_data?: UserCustomData
}

// Global override for user profile data (used after updates without page refresh)
const profileOverride = reactive<ProfileOverride>({})

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

  // Check if we have any overrides
  const hasOverrides = computed(() =>
    Object.keys(profileOverride).length > 0
  )

  // Session object with profile override support
  const session = computed<AuthSession | null>(() => {
    if (!logtoUser) return null

    // If we have overrides, merge them into the user object
    if (hasOverrides.value) {
      return {
        user: {
          ...logtoUser,
          ...(profileOverride.name !== undefined && { name: profileOverride.name }),
          ...(profileOverride.username !== undefined && { username: profileOverride.username }),
          ...(profileOverride.phone_number !== undefined && { phone_number: profileOverride.phone_number }),
          ...(profileOverride.picture !== undefined && { picture: profileOverride.picture }),
          custom_data: {
            ...(logtoUser.custom_data || {}),
            ...(profileOverride.custom_data || {})
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
  function updateAvatar(url: string) {
    profileOverride.picture = url
  }

  /**
   * Update user profile data locally without page refresh.
   * Call this after successfully updating profile data.
   */
  function updateUserProfile(data: {
    name?: string
    username?: string
    phone_number?: string
    custom_data?: UserCustomData
  }) {
    if (data.name !== undefined) {
      profileOverride.name = data.name
    }
    if (data.username !== undefined) {
      profileOverride.username = data.username
    }
    if (data.phone_number !== undefined) {
      profileOverride.phone_number = data.phone_number
    }
    if (data.custom_data !== undefined) {
      profileOverride.custom_data = {
        ...profileOverride.custom_data,
        ...data.custom_data
      }
    }
  }

  /**
   * Clear all profile overrides (useful for logout or reset)
   */
  function clearProfileOverride() {
    // Using static keys (not computed) is allowed by ESLint
    delete profileOverride.name
    delete profileOverride.username
    delete profileOverride.phone_number
    delete profileOverride.picture
    delete profileOverride.custom_data
  }

  return {
    isAuthenticated,
    session,
    updateAvatar,
    updateUserProfile,
    clearProfileOverride
  }
}
