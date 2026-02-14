import { getFile } from '../../../utils/storage'
import { createLogger, logError } from '../../../utils/logger'

const logger = createLogger('avatar-serve')

/**
 * Serve avatar file
 * GET /api/avatar/file/:filename
 *
 * Response: Image file with cache headers
 * NuxtImg/IPX handles optimization on the frontend
 */
export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')

  if (!filename) {
    throw createError({
      statusCode: 400,
      message: 'Filename is required'
    })
  }

  // Validate filename (prevent path traversal)
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw createError({
      statusCode: 400,
      message: 'Invalid filename'
    })
  }

  try {
    // Get file from storage
    const result = await getFile(filename)

    if (!result) {
      throw createError({
        statusCode: 404,
        message: 'Avatar not found'
      })
    }

    const { buffer, contentType } = result

    // Set cache headers (1 year)
    setResponseHeaders(event, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': buffer.length.toString()
    })

    return buffer
  } catch (error: unknown) {
    // If it's already a createError, re-throw
    if (error && typeof error === 'object' && '__nuxt_error' in error) {
      throw error
    }

    logError(logger, error, 'Failed to serve avatar', { filename })
    throw createError({
      statusCode: 500,
      message: 'Failed to serve avatar'
    })
  }
})
