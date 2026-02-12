import type { H3Event } from 'h3'

/**
 * Password change flow for Logto Account API:
 * 1. Verify current password via POST /api/verifications/password
 * 2. Use the verificationRecordId as logto-verification-id header
 * 3. POST /api/my-account/password with the new password
 *
 * Errors are forwarded with { errorType, code, subCodes } so the client
 * can display specific i18n messages.
 */

const logtoFetch = async (event: H3Event, path: string, options: any = {}) => {
  const client = event.context.logtoClient as any
  if (!client) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized: Logto client not available'
    })
  }

  const accessToken = await client.getAccessToken()
  const logtoEndpoint = process.env.NUXT_LOGTO_ENDPOINT || 'http://localhost:3001'

  return await $fetch(`${logtoEndpoint}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })
}

/**
 * Normalize a Logto error code for i18n lookup.
 * Replaces dots with underscores so vue-i18n doesn't interpret them as nested paths.
 * e.g. "password.rejected" -> "password__rejected"
 *      "password_rejected.pwned" -> "password_rejected__pwned"
 */
function normalizeCode(code: string): string {
  return code.replace(/\./g, '__')
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { currentPassword, password } = body

  if (!password) {
    throw createError({
      statusCode: 400,
      data: { errorType: 'validation', code: 'missing_password' },
      message: 'New password is required'
    })
  }

  // Step 1: Verify current password
  let verificationId: string | undefined
  if (currentPassword) {
    try {
      const verifyResult = await logtoFetch(event, '/api/verifications/password', {
        method: 'POST',
        body: JSON.stringify({ password: currentPassword })
      }) as any
      verificationId = verifyResult?.verificationRecordId
    } catch (e: any) {
      console.error('Verification error:', e?.data || e?.message)
      // This means the current password is wrong
      throw createError({
        statusCode: 422,
        data: {
          errorType: 'verification',
          code: normalizeCode(e?.data?.code || 'session__verification_failed')
        },
        message: 'Current password is incorrect'
      })
    }
  }

  // Step 2: Update password with verification
  try {
    const headers: Record<string, string> = {}
    if (verificationId) {
      headers['logto-verification-id'] = verificationId
    }

    await logtoFetch(event, '/api/my-account/password', {
      method: 'POST',
      headers,
      body: JSON.stringify({ password })
    })

    return { success: true }
  } catch (e: any) {
    console.error('Password update error:', e?.data || e?.message)

    // Extract Logto error code and sub-codes, normalize for i18n
    const logtoCode = normalizeCode(e?.data?.code || 'unknown')
    const logtoSubCodes = (e?.data?.data || [])
      .map((d: any) => d?.code ? normalizeCode(d.code) : null)
      .filter(Boolean)

    throw createError({
      statusCode: e?.response?.status || e?.statusCode || 500,
      data: {
        errorType: 'password_update',
        code: logtoCode,
        subCodes: logtoSubCodes
      },
      message: e?.data?.message || e?.message || 'Failed to change password'
    })
  }
})
