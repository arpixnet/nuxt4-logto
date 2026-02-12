import { ref } from 'vue'

// Type definitions for profile operations
interface ProfileUpdateData {
  name?: string
  email?: string
  [key: string]: unknown
}

interface TotpSetupResponse {
  secret: string
  qrCodeUri: string
  verificationId?: string
}

interface TotpVerifyResponse {
  success: boolean
  message?: string
}

interface MfaStatusResponse {
  enabled: boolean
  factors: string[]
}

export const useUserProfile = () => {
  // useLogtoUser returns the user object, not a composable with fetch.
  // We rely on session updates or page reloads for now.
  const { session: _session } = useAuthSession()

  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchProfile = async () => {
    loading.value = true
    error.value = null
    try {
      // Placeholder for fetching extended profile if needed
      // await fetchUser()
    } catch (e: unknown) {
      const err = e as Error
      error.value = err.message
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  const updateProfile = async (data: ProfileUpdateData) => {
    loading.value = true
    error.value = null
    try {
      await $fetch('/api/profile/update', {
        method: 'PATCH',
        body: data
      })
      // await fetchUser()
    } catch (e: unknown) {
      const err = e as Error
      error.value = err.message || 'Failed to update profile'
      throw e
    } finally {
      loading.value = false
    }
  }

  const changePassword = async (password: string, currentPassword?: string) => {
    loading.value = true
    error.value = null
    try {
      await $fetch('/api/profile/password', {
        method: 'PATCH',
        body: { password, currentPassword }
      })
    } catch (e: unknown) {
      const err = e as Error
      error.value = err.message || 'Failed to change password'
      throw e
    } finally {
      loading.value = false
    }
  }

  // 2FA: TOTP
  const setupTotp = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<TotpSetupResponse>('/api/profile/mfa/totp', {
        method: 'POST'
      })
      return response // { secret, qrCodeUri }
    } catch (e: unknown) {
      const err = e as Error
      error.value = err.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const verifyTotp = async (code: string, secret: string, verificationId?: string, password?: string) => {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch<TotpVerifyResponse>('/api/profile/mfa/totp/verify', {
        method: 'POST',
        body: { code, secret, verificationId, password }
      })
      // Return the result so the caller can check if it was successful
      return result
    } catch (e: unknown) {
      const err = e as Error
      error.value = err.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const disableTotp = async (password: string) => {
    loading.value = true
    error.value = null
    try {
      // Server requires password verification to delete MFA
      await $fetch('/api/profile/mfa/totp', {
        method: 'DELETE',
        body: { password }
      })
      // await fetchUser()
    } catch (e: unknown) {
      const err = e as Error
      error.value = err.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const getMfaStatus = async () => {
    try {
      const result = await $fetch<MfaStatusResponse>('/api/profile/mfa/status', {
        method: 'GET'
      })
      return result
    } catch (e: unknown) {
      const err = e as Error
      console.error('Failed to get MFA status:', err.message)
      return { enabled: false, factors: [] }
    }
  }

  return {
    loading,
    error,
    fetchProfile,
    updateProfile,
    changePassword,
    setupTotp,
    verifyTotp,
    disableTotp,
    getMfaStatus
  }
}
