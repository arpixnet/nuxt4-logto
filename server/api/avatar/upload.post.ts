import { getLogtoClient, getLogtoEndpoint } from '../../utils/logto-proxy'
import type { LogtoUserInfo } from '../../types/logto'
import { uploadFile, generateAvatarFilename } from '../../utils/storage'
import { createLogger, logError } from '../../utils/logger'

const logger = createLogger('avatar-upload')

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Upload avatar endpoint
 * POST /api/avatar/upload
 *
 * Accepts multipart/form-data with 'avatar' file field
 * - Validates image (max 5MB, valid image type)
 * - Stores in MinIO or local filesystem (original file, NuxtImg handles optimization)
 * - Updates user picture in Logto
 */
export default defineEventHandler(async (event) => {
  const client = getLogtoClient(event)
  const logtoEndpoint = getLogtoEndpoint()

  try {
    // Get user info
    const accessToken = await client.getAccessToken()
    const userInfo = await $fetch<LogtoUserInfo>(`${logtoEndpoint}/oidc/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    const userId = userInfo.sub
    if (!userId) {
      throw createError({
        statusCode: 400,
        message: 'User ID not found'
      })
    }

    // Read multipart form data
    const formData = await readMultipartFormData(event)

    if (!formData) {
      throw createError({
        statusCode: 400,
        message: 'No form data provided'
      })
    }

    // Find avatar file
    const avatarField = formData.find(field => field.name === 'avatar')

    if (!avatarField || !avatarField.data) {
      throw createError({
        statusCode: 400,
        message: 'No avatar file provided'
      })
    }

    const fileBuffer = avatarField.data
    const mimetype = avatarField.type || 'image/jpeg'

    // Validate file size
    if (fileBuffer.length > MAX_SIZE) {
      throw createError({
        statusCode: 400,
        message: 'Image file is too large (max 5MB)'
      })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(mimetype)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid image format. Allowed: JPEG, PNG, WebP, GIF'
      })
    }

    logger.info({ userId, mimetype, size: fileBuffer.length }, 'Processing avatar upload')

    // Get file extension from mimetype
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    }
    const ext = extensions[mimetype] || 'png'

    // Generate unique filename
    const avatarFilename = generateAvatarFilename(userId, ext)

    // Upload to storage (MinIO or local)
    const uploadResult = await uploadFile(
      avatarFilename,
      fileBuffer,
      mimetype
    )

    // Build full URL for the avatar
    const config = useRuntimeConfig()
    const baseUrl = config.public.appUrl || process.env.BASE_URL || 'http://localhost:3000'
    const avatarUrl = `${baseUrl}${uploadResult.url}`

    logger.info({ userId, avatarUrl, storage: uploadResult.storage }, 'Avatar uploaded')

    // Get current custom_data to preserve existing fields
    const currentUser = await $fetch(`${logtoEndpoint}/api/my-account`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    const currentCustomData = (currentUser as { customData?: Record<string, unknown> })?.customData || {}

    // Update user customData with avatar URL (Logto doesn't allow direct picture updates)
    await $fetch(`${logtoEndpoint}/api/my-account`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        customData: {
          ...currentCustomData,
          avatarUrl
        }
      }
    })

    logger.info({ userId, avatarUrl }, 'User custom_data updated with avatar URL')

    return {
      success: true,
      avatarUrl,
      storage: uploadResult.storage
    }
  } catch (error: unknown) {
    logError(logger, error, 'Avatar upload failed')

    // If it's already a createError, re-throw
    if (error && typeof error === 'object' && '__nuxt_error' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to upload avatar'
    })
  }
})
