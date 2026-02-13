import { ref } from 'vue'

/**
 * Error structure for profile operations
 * Matches the API error response format
 */
export interface ProfileError {
  message: string
  code?: string
  statusCode?: number
  errorType?: 'authentication' | 'verification' | 'validation' | 'password_update' | 'mfa' | 'account' | 'proxy'
  subCodes?: string[]
}

/**
 * Extract error information from API error response
 */
const extractError = (e: unknown): ProfileError => {
  if (e && typeof e === 'object') {
    const errorObj = e as Record<string, unknown>

    // Check for Nuxt/H3 error format
    if ('data' in errorObj && errorObj.data && typeof errorObj.data === 'object') {
      const data = errorObj.data as Record<string, unknown>
      return {
        message: (data.message as string) || (errorObj.message as string) || 'An error occurred',
        code: data.code as string | undefined,
        statusCode: errorObj.statusCode as number | undefined,
        errorType: data.errorType as ProfileError['errorType'],
        subCodes: data.subCodes as string[] | undefined
      }
    }

    // Standard error format
    if ('message' in errorObj) {
      return {
        message: errorObj.message as string
      }
    }
  }

  return {
    message: 'An unexpected error occurred'
  }
}

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

const clientLogger = useClientLogger()

export const useUserProfile = () => {
  const loading = ref(false)
  const error = ref<ProfileError | null>(null)

  const updateProfile = async (data: ProfileUpdateData) => {
    loading.value = true
    error.value = null
    try {
      await $fetch('/api/profile/update', {
        method: 'PATCH',
        body: data
      })
    } catch (e: unknown) {
      error.value = extractError(e)
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
      error.value = extractError(e)
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
      error.value = extractError(e)
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
      error.value = extractError(e)
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
    } catch (e: unknown) {
      error.value = extractError(e)
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
      clientLogger.error('mfa', 'Failed to get MFA status', e)
      return { enabled: false, factors: [] }
    }
  }

  const deleteAccount = async (password: string) => {
    loading.value = true
    error.value = null
    try {
      await $fetch('/api/profile/account', {
        method: 'DELETE',
        body: { password }
      })
    } catch (e: unknown) {
      error.value = extractError(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    updateProfile,
    changePassword,
    setupTotp,
    verifyTotp,
    disableTotp,
    getMfaStatus,
    deleteAccount
  }
}
