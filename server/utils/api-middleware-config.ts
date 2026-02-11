/**
 * API Middleware Configuration
 *
 * Centralized configuration for API authentication and middleware behavior.
 * This file defines routes, rate limiting, and security settings for APIs.
 *
 * Usage:
 * ```typescript
 * import { API_CONFIG } from '#utils/api-middleware-config'
 *
 * if (API_CONFIG.publicPaths.some(path => route.startsWith(path))) {
 *   // Route is public
 * }
 * ```
 */

/**
 * API Configuration
 */
export const API_CONFIG = {
  /**
   * Public API routes that don't require authentication
   * Supports wildcards: '/api/public/*' matches '/api/public/anything'
   */
  publicPaths: [
    '/api/health',
    '/api/public',
    '/api/auth',
    '/api/auth/sign-in',
    '/api/auth/sign-out'
  ] as const,

  /**
   * Protected API routes that require authentication
   * Supports wildcards: '/api/protected/*' matches '/api/protected/anything'
   */
  protectedPaths: [
    '/api/user',
    '/api/user/*',
    '/api/admin',
    '/api/admin/*',
    '/api/dashboard',
    '/api/dashboard/*'
  ] as const,

  /**
   * Rate limiting configuration
   */
  rateLimit: {
    /**
     * Maximum number of requests allowed in the time window
     */
    maxRequests: 100,

    /**
     * Time window in seconds (default: 15 minutes)
     */
    windowSeconds: 900,

    /**
     * Custom rate limits for specific route patterns
     * Key: route pattern
     * Value: rate limit config
     */
    routeLimits: {
      '/api/auth/*': {
        maxRequests: 10,
        windowSeconds: 60 // 10 requests per minute for auth routes
      },
      '/api/admin/*': {
        maxRequests: 50,
        windowSeconds: 900 // Stricter for admin routes
      }
    }
  },

  /**
   * Security headers configuration
   */
  security: {
    /**
     * Content-Security-Policy
     */
    csp: 'default-src \'self\'',

    /**
     * X-Frame-Options
     */
    frameOptions: 'DENY',

    /**
     * X-Content-Type-Options
     */
    nosniff: 'nosniff',

    /**
     * X-XSS-Protection
     */
    xssProtection: '1; mode=block',

    /**
     * Referrer-Policy
     */
    referrerPolicy: 'strict-origin-when-cross-origin'
  }
} as const

/**
 * Check if a route is public
 *
 * @param route - API route path
 * @returns true if route is public
 *
 * @example
 * isPublicRoute('/api/health') // true
 * isPublicRoute('/api/user/profile') // false
 */
export function isPublicRoute(route: string): boolean {
  return API_CONFIG.publicPaths.some(path => matchRoute(route, path))
}

/**
 * Check if a route is protected
 *
 * @param route - API route path
 * @returns true if route is protected
 *
 * @example
 * isProtectedRoute('/api/user/profile') // true
 * isProtectedRoute('/api/health') // false
 */
export function isProtectedRoute(route: string): boolean {
  return API_CONFIG.protectedPaths.some(path => matchRoute(route, path))
}

/**
 * Get rate limit configuration for a route
 *
 * Returns route-specific limits if defined, otherwise returns default limits
 *
 * @param route - API route path
 * @returns Rate limit configuration
 *
 * @example
 * getRateLimitConfig('/api/auth/login')
 * // Returns { maxRequests: 10, windowSeconds: 60 }
 *
 * getRateLimitConfig('/api/user/profile')
 * // Returns { maxRequests: 100, windowSeconds: 900 }
 */
export function getRateLimitConfig(route: string): {
  maxRequests: number
  windowSeconds: number
} {
  // Check for route-specific limits
  for (const [pattern, limits] of Object.entries(API_CONFIG.rateLimit.routeLimits)) {
    if (matchRoute(route, pattern)) {
      return limits
    }
  }

  // Return default limits
  return {
    maxRequests: API_CONFIG.rateLimit.maxRequests,
    windowSeconds: API_CONFIG.rateLimit.windowSeconds
  }
}

/**
 * Match a route against a pattern with wildcard support
 *
 * Supports '*' as wildcard that matches any path segment
 *
 * @param route - The actual route
 * @param pattern - The pattern to match against
 * @returns true if route matches pattern
 *
 * @example
 * matchRoute('/api/user/profile', '/api/user/*') // true
 * matchRoute('/api/user/profile', '/api/health') // false
 * matchRoute('/api/user/profile', '/api/user/profile') // true
 */
function matchRoute(route: string, pattern: string): boolean {
  // Exact match
  if (route === pattern) {
    return true
  }

  // Wildcard match
  if (pattern.endsWith('/*')) {
    const basePattern = pattern.slice(0, -2)
    return route === basePattern || route.startsWith(basePattern + '/')
  }

  return false
}

/**
 * Get security headers as object
 *
 * @returns Security headers object ready for use with setHeader
 *
 * @example
 * const headers = getSecurityHeaders()
 * for (const [key, value] of Object.entries(headers)) {
 *   event.node.res.setHeader(key, value)
 * }
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': API_CONFIG.security.nosniff,
    'X-Frame-Options': API_CONFIG.security.frameOptions,
    'X-XSS-Protection': API_CONFIG.security.xssProtection,
    'Referrer-Policy': API_CONFIG.security.referrerPolicy,
    'Content-Security-Policy': API_CONFIG.security.csp
  }
}
