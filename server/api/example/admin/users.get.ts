/**
 * Admin Users Endpoint
 *
 * Protected endpoint for admin users to list all users.
 * Demonstrates:
 * - Using event.context.apiProtected to mark as protected route
 * - Accessing event.context.user for user data
 * - Role-based authorization (user must have 'admin' role)
 * - Returning 403 Forbidden if user lacks required role
 * - Rate limiting is applied (50 req/15 min for admin routes)
 *
 * @route GET /api/example/admin/users
 * @public false
 * @auth required (JWT token with 'admin' role)
 *
 * @example
 * curl -H "Authorization: Bearer <token>" http://localhost:3000/api/example/admin/users
 *
 * @returns List of users (or 403 if not admin)
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

  // Get user roles from JWT claims
  const userRoles = (user.roles as string[]) || []
  const requiredRoles = ['admin']

  // Check if user has required role
  const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role))

  if (!hasRequiredRole) {
    apiLogger.warn(
      {
        path: event.path,
        method: event.method,
        userId: user.sub,
        userRoles,
        requiredRoles
      },
      'User lacks required role - access denied'
    )

    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: You do not have the required permissions',
      data: {
        error: 'insufficient_permissions',
        message: 'This endpoint requires admin role',
        userRoles,
        requiredRoles
      }
    })
  }

  apiLogger.info(
    {
      path: event.path,
      method: event.method,
      userId: user.sub,
      userRoles
    },
    'Admin users list requested'
  )

  // Return mock users list (in production, this would query database)
  return {
    admin: {
      userId: user.sub,
      email: user.email,
      name: user.name
    },
    users: [
      {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User One',
        role: 'user'
      },
      {
        id: 'user-2',
        email: 'user2@example.com',
        name: 'User Two',
        role: 'user'
      },
      {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 3
    },
    features: [
      'JWT token validated',
      'Admin role verified',
      'Rate limiting applied (50 req/15 min for admin)',
      'Security headers included'
    ],
    timestamp: new Date().toISOString()
  }
})
