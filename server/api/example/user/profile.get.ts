/**
 * User Profile Endpoint
 *
 * Protected endpoint that returns authenticated user's profile data.
 * Demonstrates:
 * - Using event.context.apiProtected to mark as protected route
 * - Accessing event.context.user (validated by api-protected middleware)
 * - JWT token is validated before this code executes
 * - Rate limiting is applied (100 req/15 min default)
 *
 * @route GET /api/example/user/profile
 * @public false
 * @auth required (JWT token)
 *
 * @example
 * curl -H "Authorization: Bearer <token>" http://localhost:3000/api/example/user/profile
 *
 * @returns User profile object
 */

import { apiLogger } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  // Mark as protected route - api-protected middleware will validate JWT
  event.context.apiProtected = true

  // User is available and validated by api-protected middleware
  const user = event.context.user

  if (!user) {
    apiLogger.error(
      {
        path: event.path,
        method: event.method
      },
      'User context not available - middleware error'
    )

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error: User context not available'
    })
  }

  apiLogger.info(
    {
      path: event.path,
      method: event.method,
      userId: user.sub
    },
    'User profile requested'
  )

  // Return user profile data
  return {
    userId: user.sub,
    email: user.email,
    name: user.name || 'User',
    picture: user.picture || null,
    emailVerified: user.email_verified || false,
    // Additional claims from JWT
    iss: user.iss,
    aud: user.aud,
    exp: user.exp,
    iat: user.iat,
    // Response metadata
    features: [
      'JWT token validated',
      'User authenticated',
      'Rate limiting applied (100 req/15 min)',
      'Security headers included'
    ],
    timestamp: new Date().toISOString()
  }
})
