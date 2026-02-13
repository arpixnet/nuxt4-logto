/**
 * Logto Type Definitions
 *
 * This file contains all type definitions for Logto integration.
 */

/**
 * User custom data stored in Logto
 * Customize this interface based on your application's custom fields
 */
export interface UserCustomData {
  address?: string
  birthDate?: string
  // Add more custom fields here as needed
  [key: string]: unknown
}

/**
 * Logto account API client interface
 * Used for accessing user's own account data via my-account API
 */
export interface LogtoAccountClient {
  getAccessToken: () => Promise<string>
  getIdToken: () => Promise<string | null>
  getContext: (params?: {
    getAccessToken?: boolean
    fetchUserInfo?: boolean
  }) => Promise<{
    isAuthenticated: boolean
    claims?: unknown
    accessToken?: string
    userInfo?: LogtoUserInfo
  }>
}

/**
 * Logto user info returned by getContext
 */
export interface LogtoUserInfo {
  sub?: string
  email?: string
  name?: string
  picture?: string
  username?: string
  custom_data?: UserCustomData
  [key: string]: unknown
}

/**
 * Standard Logto error response structure
 */
export interface LogtoErrorResponse {
  response?: {
    status?: number
    _data?: LogtoErrorData
  }
  statusCode?: number
  message?: string
}

/**
 * Logto error data structure
 */
export interface LogtoErrorData {
  code?: string
  message?: string
  data?: Array<{ code?: string }>
}

/**
 * MFA factor types in Logto
 */
export type MfaFactorType = 'Totp' | 'BackupCode' | 'WebAuthn'

/**
 * Logto MFA factor representation
 */
export interface LogtoMfaFactor {
  id: string
  type: MfaFactorType
  createdAt?: number
}

/**
 * Logto TOTP secret response
 */
export interface LogtoTotpSecretResponse {
  secret: string
  secretQrCode?: string
  verificationId?: string
}

/**
 * Logto user info from context
 * This is the main user type used throughout the application
 */
export interface LogtoUser {
  sub?: string
  email?: string
  name?: string
  picture?: string
  username?: string
  custom_data?: UserCustomData
}

/**
 * Password verification response from Logto
 */
export interface LogtoPasswordVerificationResponse {
  verificationRecordId: string
}

/**
 * Standardized API error response structure
 */
export interface ApiErrorResponse {
  errorType: 'authentication' | 'verification' | 'validation' | 'password_update' | 'mfa' | 'account' | 'proxy'
  code: string
  message: string
  subCodes?: string[]
}

/**
 * Options for Logto proxy requests
 */
export interface LogtoProxyOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown> | string
  headers?: Record<string, string>
  verificationId?: string
  apiBase?: 'my-account' | 'verifications'
}
