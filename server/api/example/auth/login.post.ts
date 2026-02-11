/**
 * Login Endpoint
 *
 * Public authentication endpoint with strict rate limiting.
 * Demonstrates:
 * - Using event.context.apiPublic to mark as public route
 * - Rate limiting is applied (10 req/1 min for /api/auth/* routes)
 * - Returns rate limit headers in response
 * - Mock login endpoint (in production, integrate with Logto)
 *
 * @route POST /api/example/auth/login
 * @public true
 * @auth none
 *
 * @example
 * curl -X POST http://localhost:3000/api/example/auth/login \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"user@example.com","password":"password"}'
 *
 * @returns Login response with rate limit headers
 */

import { apiLogger } from '../../../utils/logger'
import { getRateLimitConfig } from '../../../utils/api-middleware-config'

export default defineEventHandler(async (event) => {
  // Mark as public route
  event.context.apiPublic = true

  const body = await readBody(event)
  const { email, password } = body

  apiLogger.info(
    {
      path: event.path,
      method: event.method,
      email
    },
    'Login requested'
  )

  // Get route-specific rate limit config
  const rateLimitConfig = getRateLimitConfig('/api/auth/login')

  apiLogger.debug(
    {
      route: '/api/auth/login',
      rateLimitConfig
    },
    'Route-specific rate limit config applied'
  )

  // Validate input
  if (!email || !password) {
    apiLogger.warn(
      { email },
      'Login failed: missing credentials'
    )

    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Email and password are required',
      data: {
        error: 'missing_credentials',
        message: 'Email and password are required'
      }
    })
  }

  // Mock login validation (in production, use Logto)
  // This is just an example endpoint
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isValidPassword = password.length >= 6

  if (!isValidEmail || !isValidPassword) {
    apiLogger.warn(
      { email, isValidEmail, isValidPassword },
      'Login failed: invalid credentials'
    )

    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Invalid email or password',
      data: {
        error: 'invalid_credentials',
        message: 'Invalid email or password'
      }
    })
  }

  // Mock successful login
  apiLogger.info(
    { email },
    'Login successful'
  )

  return {
    success: true,
    message: 'Login successful',
    user: {
      email,
      // In production, return actual user data from Logto
      name: 'User'
    },
    // Rate limit info (middleware already adds headers)
    rateLimitInfo: {
      maxRequests: rateLimitConfig.maxRequests,
      windowSeconds: rateLimitConfig.windowSeconds,
      note: 'Rate limit headers are included in response'
    },
    features: [
      'Public endpoint',
      'Strict rate limiting (10 req/1 min for auth routes)',
      'Security headers included',
      'Rate limit headers in response'
    ],
    timestamp: new Date().toISOString()
  }
})
