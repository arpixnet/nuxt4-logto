/**
 * Authentication Middleware
 *
 * This middleware protects routes that require authentication using Logto.
 *
 * Logto handles authentication through redirects to its hosted pages.
 * The middleware checks if the user is authenticated and redirects to
 * the sign-in page if necessary.
 *
 * @example
 * ```vue
 * <script setup>
 * definePageMeta({
 *   middleware: 'auth',
 *   requiresAuth: true,
 *   roles: ['admin', 'editor'] // Optional: required roles
 * })
 * </script>
 * ```
 */
export default defineNuxtRouteMiddleware((to) => {
  const logger = useClientLogger({ serverMinLevel: 'error' })

  // Allow public routes explicitly marked
  if (to.meta.public === true) {
    return
  }

  // Skip if route doesn't require auth
  if (!to.meta.requiresAuth) {
    return
  }

  // Prevent redirect loops if already on sign-in page
  if (to.path === '/sign-in') {
    return
  }

  // Use AuthSession composable for consistent auth management
  const { isAuthenticated, session } = useAuthSession()

  // Check if user is authenticated
  if (!isAuthenticated.value) {
    const redirectPath = to.fullPath !== '/' ? to.fullPath : undefined
    logger.warn('auth-middleware', 'Redirecting to sign-in', {
      route: to.fullPath,
      redirectPath,
      reason: 'not_authenticated'
    })

    return navigateTo({
      path: '/sign-in',
      query: redirectPath ? { redirect: redirectPath } : undefined
    })
  }

  // Check for required roles/permissions
  const requiredRoles = to.meta.roles as string[] | undefined
  if (requiredRoles && requiredRoles.length > 0) {
    const user = session.value?.user
    const userRoles = (user?.roles as string[]) || []
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role))

    if (!hasRequiredRole) {
      logger.warn('auth-middleware', 'User lacks required role', {
        userId: user?.sub,
        requiredRoles,
        userRoles,
        route: to.fullPath
      })

      // Redirect to 403 or dashboard with error
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: You do not have the required permissions'
      })
    }
  }
})
