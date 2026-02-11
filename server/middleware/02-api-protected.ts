/**
 * Server-side Protected API Middleware
 *
 * This middleware validates JWT tokens for protected API routes.
 * It ensures that only authenticated users with valid tokens can access
 * protected endpoints.
 *
 * Usage in API routes:
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *   event.context.apiProtected = true
 *   const user = event.context.user // User validated and available
 *   // ...
 * })
 * ```
 *
 * Features:
 * - Validates JWT tokens from Authorization header or cookie
 * - Extracts user claims and makes them available in event.context.user
 * - Supports Bearer token format
 * - Returns 401 if no valid token is provided
 */

import { authLogger } from '../utils/logger'
import type { H3Event } from 'h3'

interface LogtoClient {
  verifyToken: (token: string) => Promise<ProtectedUser>
}

declare module 'h3' {
  interface H3EventContext {
    apiProtected?: boolean
    logtoClient?: LogtoClient
    user?: ProtectedUser
  }
}

export interface ProtectedUser {
  sub: string
  aud: string
  iss: string
  exp: number
  iat: number
  [key: string]: unknown
}

export default defineEventHandler(async (event) => {
  // Skip if not an API route
  if (!event.path.startsWith('/api/')) {
    return
  }

  // Skip if route is not marked as protected
  if (event.context.apiProtected !== true) {
    return
  }

  // Check if Logto client is initialized
  const logtoClient = event.context.logtoClient
  if (!logtoClient) {
    authLogger.error({
      path: event.path,
      method: event.method
    }, 'Auth context not initialized - api-auth middleware must run first')

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error: Authentication context not available'
    })
  }

  // Get token from Authorization header or cookie
  const token = getAuthToken(event)

  if (!token) {
    authLogger.warn({
      path: event.path,
      method: event.method,
      reason: 'missing_token'
    }, 'Authentication failed: No token provided')

    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: No authentication token provided',
      data: {
        error: 'missing_token',
        message: 'Please provide an authentication token in the Authorization header or cookie'
      }
    })
  }

  // Validate token with Logto
  try {
    if (!logtoClient.verifyToken) {
      authLogger.error({
        path: event.path,
        method: event.method
      }, 'Logto client does not have verifyToken method')

      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error: Invalid Logto client configuration'
      })
    }

    // Verify token using Logto client
    const claims = await logtoClient.verifyToken(token)

    // Store user claims in event context
    event.context.user = claims

    authLogger.debug({
      userId: claims.sub,
      path: event.path
    }, 'User authenticated successfully')
  } catch (error) {
    authLogger.warn({
      path: event.path,
      method: event.method,
      error: error instanceof Error ? error.message : String(error)
    }, 'Authentication failed: Invalid token')

    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Invalid or expired token',
      data: {
        error: 'invalid_token',
        message: 'The provided token is invalid or has expired'
      }
    })
  }
})

/**
 * Extract authentication token from request
 *
 * Priority:
 * 1. Authorization header (Bearer token)
 * 2. Cookie (logto_token)
 *
 * @param event - H3 event object
 * @returns Token string or null if not found
 */
function getAuthToken(event: H3Event): string | null {
  // Try Authorization header first
  const authHeader = getHeader(event, 'authorization')
  if (authHeader) {
    // Extract Bearer token
    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    if (match && match[1]) {
      return match[1]
    }
  }

  // Try cookie
  const cookieToken = getCookie(event, 'logto_token')
  if (cookieToken) {
    return cookieToken
  }

  // No token found
  return null
}
