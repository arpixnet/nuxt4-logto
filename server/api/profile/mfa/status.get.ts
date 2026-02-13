import type { LogtoMfaFactor } from '../../../types/logto'
import { logtoProxy } from '../../../utils/logto-proxy'

export default defineEventHandler(async (event) => {
  // Use my-account API to get MFA verifications
  // This endpoint works with the user's access token and doesn't require M2M credentials
  const response = await logtoProxy<LogtoMfaFactor[] | { data: LogtoMfaFactor[] }>(
    event,
    '/mfa-verifications',
    { method: 'GET' }
  )

  // Handle both response formats: direct array or { data: array }
  let mfaFactors: LogtoMfaFactor[] = []
  if (Array.isArray(response)) {
    mfaFactors = response
  } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
    mfaFactors = response.data
  }

  // Check if user has TOTP enabled
  const hasTotp = mfaFactors.some(mfa => mfa.type === 'Totp')

  return {
    enabled: hasTotp,
    factors: mfaFactors.map(mfa => mfa.type)
  }
})
