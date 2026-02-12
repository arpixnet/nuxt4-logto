import { ref } from 'vue'

export const useUserProfile = () => {
  // useLogtoUser returns the user object, not a composable with fetch.
  // We rely on session updates or page reloads for now.
  const { session } = useAuthSession()

  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchProfile = async () => {
    loading.value = true
    error.value = null
    try {
      // Placeholder for fetching extended profile if needed
      // await fetchUser() 
    } catch (e: any) {
      error.value = e.message
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  const updateProfile = async (data: any) => {
    loading.value = true
    error.value = null
    try {
      await $fetch('/api/profile/update', {
        method: 'PATCH',
        body: data
      })
      // await fetchUser()
    } catch (e: any) {
      error.value = e.message || 'Failed to update profile'
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
    } catch (e: any) {
      error.value = e.message || 'Failed to change password'
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
      const response = await $fetch<any>('/api/profile/mfa/totp', {
        method: 'POST'
      })
      return response // { secret, qrCodeUri }
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const verifyTotp = async (code: string, secret?: string) => {
    loading.value = true
    error.value = null
    try {
      await $fetch('/api/profile/mfa/totp/verify', {
        method: 'POST',
        body: { code, secret }
      })
      // await fetchUser()
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const disableTotp = async () => {
    loading.value = true
    error.value = null
    try {
      // We assume the server handles finding the correct MFA ID to delete
      await $fetch('/api/profile/mfa/totp', {
        method: 'DELETE'
      })
      // await fetchUser()
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
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
    disableTotp
  }
}

