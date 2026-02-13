import type { LogtoTotpSecretResponse, LogtoUser } from '../../../types/logto'
import { createLogger } from '../../../utils/logger'
import { logtoProxy, buildOtpAuthUri } from '../../../utils/logto-proxy'

const logger = createLogger('mfa-totp')

export default defineEventHandler(async (event) => {
  // Get user info from session to build otpauth URI if needed
  const logtoUser = event.context.logtoUser as LogtoUser | undefined
  const userEmail = logtoUser?.email || 'user@example.com'

  // Note: Skipping the GET /mfa-verifications check since it requires 'identity' scope
  // which may not be available. The generate endpoint works without it.
  // If there's an existing unverified secret, Logto will return it instead of creating a new one.

  // Step 1: Generate TOTP secret using Logto's my-account API
  // This endpoint generates a new TOTP secret and QR code for the user to scan
  // Path: /api/my-account/mfa-verifications/totp-secret/generate
  const result = await logtoProxy<LogtoTotpSecretResponse>(event, '/mfa-verifications/totp-secret/generate', {
    method: 'POST'
  })

  // If Logto provides the QR code URI, use it directly
  // Otherwise, build the otpauth:// URI ourselves from the secret
  let qrCodeUri = result.secretQrCode

  if (!qrCodeUri && result.secret) {
    // Logto didn't provide QR code (e.g., when secret already exists but not verified)
    // Build the otpauth:// URI ourselves so VueQrcode can generate the QR
    qrCodeUri = buildOtpAuthUri(result.secret, userEmail)
  }

  return {
    secret: result.secret,
    qrCodeUri,
    verificationId: result.verificationId
  }
})
