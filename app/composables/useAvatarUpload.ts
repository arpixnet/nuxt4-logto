import type { FetchError } from 'ofetch'

export interface AvatarUploadResult {
  success: boolean
  avatarUrl?: string
  storage?: 'minio' | 'local'
  error?: string
}

export interface UseAvatarUploadOptions {
  onSuccess?: (result: AvatarUploadResult) => void
  onError?: (error: string) => void
}

export function useAvatarUpload(options: UseAvatarUploadOptions = {}) {
  const uploading = ref(false)
  const error = ref<string | null>(null)
  const previewUrl = ref<string | null>(null)

  /**
   * Validate file before upload
   */
  function validateFile(file: File): { valid: boolean, error?: string } {
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Invalid image format. Allowed: JPEG, PNG, WebP, GIF' }
    }

    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'Image file is too large (max 5MB)' }
    }

    return { valid: true }
  }

  /**
   * Create preview URL from file
   */
  function createPreview(file: File): void {
    // Revoke previous preview URL if exists
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }

    previewUrl.value = URL.createObjectURL(file)
  }

  /**
   * Clear preview URL
   */
  function clearPreview(): void {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
  }

  /**
   * Upload avatar file
   */
  async function uploadAvatar(file: File): Promise<AvatarUploadResult> {
    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      error.value = validation.error || 'Invalid file'
      options.onError?.(validation.error || 'Invalid file')
      return { success: false, error: validation.error }
    }

    uploading.value = true
    error.value = null

    // Create preview
    createPreview(file)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await $fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData
      })

      const result = response as AvatarUploadResult

      if (result.success) {
        options.onSuccess?.(result)
        return result
      }

      throw new Error(result.error || 'Upload failed')
    } catch (e: unknown) {
      const fetchError = e as FetchError
      const errorMessage = fetchError.data?.message || fetchError.message || 'Failed to upload avatar'

      error.value = errorMessage
      options.onError?.(errorMessage)

      return { success: false, error: errorMessage }
    } finally {
      uploading.value = false
    }
  }

  /**
   * Handle file input change event
   */
  async function handleFileChange(event: Event): Promise<AvatarUploadResult | null> {
    const input = event.target as HTMLInputElement

    if (!input.files || input.files.length === 0) {
      return null
    }

    const file = input.files[0]
    if (!file) {
      return null
    }

    return uploadAvatar(file)
  }

  /**
   * Reset state
   */
  function reset(): void {
    clearPreview()
    error.value = null
    uploading.value = false
  }

  // Cleanup on unmount
  onUnmounted(() => {
    clearPreview()
  })

  return {
    uploading: readonly(uploading),
    error: readonly(error),
    previewUrl: readonly(previewUrl),
    uploadAvatar,
    handleFileChange,
    validateFile,
    createPreview,
    clearPreview,
    reset
  }
}
