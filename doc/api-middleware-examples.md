# API Middleware Examples Documentation

This document provides comprehensive documentation for the API middleware examples demonstrating authentication, rate limiting, and security features in the Nuxt 4 application.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Middleware Execution Order](#middleware-execution-order)
- [Examples](#examples)
  - [1. Health Check](#1-health-check)
  - [2. Public Data](#2-public-data)
  - [3. User Profile](#3-user-profile)
  - [4. Admin Users](#4-admin-users)
  - [5. Custom Configuration](#5-custom-configuration)
  - [6. Login](#6-login)
  - [7. Rate Limited](#7-rate-limited)
- [API Config Reference](#api-config-reference)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

This application uses a comprehensive middleware system for API routes that provides:

- **Authentication** via JWT tokens with Logto
- **Authorization** via role-based access control
- **Rate Limiting** to prevent abuse
- **Security Headers** for protection against common vulnerabilities
- **Structured Logging** for debugging and monitoring

---

## Architecture

### Server Middleware

The server has two middleware files that execute in order:

1. **`01-api-auth.ts`** - Runs first, sets up context and applies security
2. **`02-api-protected.ts`** - Runs second, validates JWT tokens

### Configuration File

**`server/utils/api-middleware-config.ts`** - Centralized configuration for:
- Public routes
- Protected routes
- Rate limiting rules
- Security headers

---

## Middleware Execution Order

```
Request → 01-api-auth.ts → 02-api-protected.ts → API Route
              ↓                    ↓
         - Add headers          - Extract JWT
         - Rate limit          - Validate token
         - Init Logto          - Set user context
              ↓                    ↓
         Headers sent          User available
         to all routes        in event.context
```

### Execution Order Rules

1. Middleware files execute in **alphabetical order** by filename
2. `01-api-auth.ts` always runs first (prepares context)
3. `02-api-protected.ts` runs second (validates auth)
4. API routes execute last

---

## Examples

### 1. Health Check

**Endpoint:** `GET /api/example/health`

**Purpose:** Public health check endpoint to verify API status.

**Authentication:** None required

**Rate Limiting:** 100 requests per 15 minutes (default)

#### Request

```bash
curl http://localhost:3000/api/example/health
```

#### Response

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "development",
  "version": "1.0.0"
}
```

#### Implementation Details

```typescript
export default defineEventHandler(async (event) => {
  // Mark as public - api-auth adds headers only
  event.context.apiPublic = true
  
  // Return health status
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  }
})
```

#### Security Headers Added

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self'`

---

### 2. Public Data

**Endpoint:** `GET /api/example/public`

**Purpose:** Returns publicly accessible information without authentication.

**Authentication:** None required

**Rate Limiting:** 100 requests per 15 minutes (default)

#### Request

```bash
curl http://localhost:3000/api/example/public
```

#### Response

```json
{
  "message": "This is public data",
  "accessibleBy": "everyone",
  "features": [
    "No authentication required",
    "Rate limiting applied (100 req/15 min)",
    "Security headers included"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Implementation Details

```typescript
export default defineEventHandler(async (event) => {
  // Mark as public route
  event.context.apiPublic = true
  
  return {
    message: 'This is public data',
    accessibleBy: 'everyone',
    features: [
      'No authentication required',
      'Rate limiting applied (100 req/15 min)',
      'Security headers included'
    ],
    timestamp: new Date().toISOString()
  }
})
```

---

### 3. User Profile

**Endpoint:** `GET /api/example/user/profile`

**Purpose:** Returns authenticated user's profile data.

**Authentication:** Required (JWT Bearer token)

**Rate Limiting:** 100 requests per 15 minutes (default)

#### Request

```bash
curl -H "Authorization: Bearer <jwt_token>" \
  http://localhost:3000/api/example/user/profile
```

#### Success Response (200)

```json
{
  "userId": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://example.com/avatar.jpg",
  "emailVerified": true,
  "iss": "https://your-logto-app.com",
  "aud": "your-client-id",
  "exp": 1705330200,
  "iat": 1705326600,
  "features": [
    "JWT token validated",
    "User authenticated",
    "Rate limiting applied (100 req/15 min)",
    "Security headers included"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Error Response (401)

```json
{
  "statusCode": 401,
  "statusMessage": "Unauthorized",
  "message": "No token provided or token is invalid"
}
```

#### Implementation Details

```typescript
export default defineEventHandler(async (event) => {
  // Mark as protected - api-protected validates JWT
  event.context.apiProtected = true
  
  // User is validated by middleware
  const user = event.context.user
  
  return {
    userId: user.sub,
    email: user.email,
    name: user.name || 'User',
    picture: user.picture || null,
    emailVerified: user.email_verified || false,
    // JWT claims
    iss: user.iss,
    aud: user.aud,
    exp: user.exp,
    iat: user.iat
  }
})
```

---

### 4. Admin Users

**Endpoint:** `GET /api/example/admin/users`

**Purpose:** Lists all users (admin only).

**Authentication:** Required (JWT Bearer token with `admin` role)

**Rate Limiting:** 50 requests per 15 minutes (admin-specific)

#### Request

```bash
curl -H "Authorization: Bearer <admin_jwt_token>" \
  http://localhost:3000/api/example/admin/users
```

#### Success Response (200)

```json
{
  "admin": {
    "userId": "admin-123",
    "email": "admin@example.com",
    "name": "Admin User"
  },
  "users": [
    {
      "id": "user-1",
      "email": "user1@example.com",
      "name": "User One",
      "role": "user"
    },
    {
      "id": "user-2",
      "email": "user2@example.com",
      "name": "User Two",
      "role": "user"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2
  },
  "features": [
    "JWT token validated",
    "Admin role verified",
    "Rate limiting applied (50 req/15 min for admin)",
    "Security headers included"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Error Response (403) - No Admin Role

```json
{
  "statusCode": 403,
  "statusMessage": "Forbidden: You do not have the required permissions",
  "data": {
    "error": "insufficient_permissions",
    "message": "This endpoint requires admin role",
    "userRoles": ["user"],
    "requiredRoles": ["admin"]
  }
}
```

#### Implementation Details

```typescript
export default defineEventHandler(async (event) => {
  event.context.apiProtected = true
  const user = event.context.user
  
  // Check user roles
  const userRoles = (user.roles as string[]) || []
  const requiredRoles = ['admin']
  
  const hasRequiredRole = requiredRoles.some(
    role => userRoles.includes(role)
  )
  
  if (!hasRequiredRole) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      data: {
        error: 'insufficient_permissions',
        message: 'This endpoint requires admin role',
        userRoles,
        requiredRoles
      }
    })
  }
  
  // Return users list
  return { users: [...] }
})
```

---

### 5. Custom Configuration

**Endpoint:** `GET /api/example/custom`

**Purpose:** Demonstrates dynamic configuration using `API_CONFIG` utilities.

**Authentication:** None required (public via config)

**Rate Limiting:** 100 requests per 15 minutes (default)

#### Request

```bash
curl http://localhost:3000/api/example/custom
```

#### Response

```json
{
  "route": "/api/example/custom",
  "isPublic": true,
  "isProtected": false,
  "rateLimitConfig": {
    "maxRequests": 100,
    "windowSeconds": 900,
    "requestsPerMinute": 7
  },
  "securityHeaders": {
    "count": 5,
    "headers": [
      "X-Content-Type-Options",
      "X-Frame-Options",
      "X-XSS-Protection",
      "Referrer-Policy",
      "Content-Security-Policy"
    ]
  },
  "features": [
    "Dynamic public route detection via isPublicRoute()",
    "Dynamic protected route detection via isProtectedRoute()",
    "Route-specific rate limits via getRateLimitConfig()",
    "Security headers via getSecurityHeaders()",
    "Configured in API_CONFIG (api-middleware-config.ts)"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Implementation Details

```typescript
import {
  isPublicRoute,
  isProtectedRoute,
  getRateLimitConfig,
  getSecurityHeaders
} from '../../utils/api-middleware-config'

export default defineEventHandler(async (event) => {
  const route = event.path
  
  // Dynamic route detection
  if (isPublicRoute(route)) {
    event.context.apiPublic = true
  }
  
  if (isProtectedRoute(route)) {
    event.context.apiProtected = true
  }
  
  // Get route-specific config
  const rateLimitConfig = getRateLimitConfig(route)
  const securityHeaders = getSecurityHeaders()
  
  return {
    route,
    isPublic: isPublicRoute(route),
    isProtected: isProtectedRoute(route),
    rateLimitConfig: {
      maxRequests: rateLimitConfig.maxRequests,
      windowSeconds: rateLimitConfig.windowSeconds
    },
    securityHeaders: {
      count: Object.keys(securityHeaders).length
    }
  }
})
```

---

### 6. Login

**Endpoint:** `POST /api/example/auth/login`

**Purpose:** Public authentication endpoint with strict rate limiting.

**Authentication:** None required

**Rate Limiting:** 10 requests per 1 minute (auth-specific)

#### Request

```bash
curl -X POST http://localhost:3000/api/example/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "email": "user@example.com",
    "name": "User"
  },
  "rateLimitInfo": {
    "maxRequests": 10,
    "windowSeconds": 60,
    "note": "Rate limit headers are included in response"
  },
  "features": [
    "Public endpoint",
    "Strict rate limiting (10 req/1 min for auth routes)",
    "Security headers included",
    "Rate limit headers in response"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Error Response (400) - Missing Credentials

```json
{
  "statusCode": 400,
  "statusMessage": "Bad Request: Email and password are required",
  "data": {
    "error": "missing_credentials",
    "message": "Email and password are required"
  }
}
```

#### Error Response (401) - Invalid Credentials

```json
{
  "statusCode": 401,
  "statusMessage": "Unauthorized: Invalid email or password",
  "data": {
    "error": "invalid_credentials",
    "message": "Invalid email or password"
  }
}
```

#### Rate Limit Headers in Response

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1705330200
```

#### Implementation Details

```typescript
import { getRateLimitConfig } from '../../utils/api-middleware-config'

export default defineEventHandler(async (event) => {
  event.context.apiPublic = true
  
  const body = await readBody(event)
  const { email, password } = body
  
  // Get auth-specific rate limit
  const rateLimitConfig = getRateLimitConfig('/api/auth/login')
  
  // Validate credentials
  if (!email || !password) {
    throw createError({
      statusCode: 400,
      data: {
        error: 'missing_credentials'
      }
    })
  }
  
  // Mock validation
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isValidPassword = password.length >= 6
  
  if (!isValidEmail || !isValidPassword) {
    throw createError({
      statusCode: 401,
      data: {
        error: 'invalid_credentials'
      }
    })
  }
  
  return { success: true, user: { email } }
})
```

---

### 7. Rate Limited

**Endpoint:** `GET /api/example/rate-limited`

**Purpose:** Demonstrates rate limiting headers and security headers.

**Authentication:** Required (JWT Bearer token)

**Rate Limiting:** 100 requests per 15 minutes (default)

#### Request

```bash
curl -H "Authorization: Bearer <jwt_token>" \
  http://localhost:3000/api/example/rate-limited
```

#### Success Response (200)

```json
{
  "user": {
    "userId": "user-123",
    "email": "user@example.com"
  },
  "rateLimit": {
    "limit": 100,
    "remaining": 95,
    "reset": 1705330200,
    "resetDate": "2024-01-15T10:30:00.000Z",
    "note": "These headers are automatically added by api-auth middleware"
  },
  "securityHeaders": {
    "applied": true,
    "headers": {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy": "default-src 'self'"
    },
    "note": "Security headers are automatically added by api-auth middleware"
  },
  "features": [
    "JWT token validated",
    "Rate limiting applied (100 req/15 min default)",
    "Rate limit headers in response (X-RateLimit-*)",
    "Security headers in response",
    "User authenticated"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Rate Limit Headers in Response

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705330200
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
```

#### Implementation Details

```typescript
export default defineEventHandler(async (event) => {
  event.context.apiProtected = true
  const user = event.context.user
  
  // Get rate limit headers from response
  const rateLimitHeaders = {
    limit: event.node.res.getHeader('X-RateLimit-Limit'),
    remaining: event.node.res.getHeader('X-RateLimit-Remaining'),
    reset: event.node.res.getHeader('X-RateLimit-Reset')
  }
  
  // Get security headers
  const securityHeaders = {
    contentTypeOptions: event.node.res.getHeader('X-Content-Type-Options'),
    frameOptions: event.node.res.getHeader('X-Frame-Options'),
    xssProtection: event.node.res.getHeader('X-XSS-Protection'),
    referrerPolicy: event.node.res.getHeader('Referrer-Policy'),
    csp: event.node.res.getHeader('Content-Security-Policy')
  }
  
  return {
    user: { userId: user.sub },
    rateLimit: rateLimitHeaders,
    securityHeaders
  }
})
```

---

## API Config Reference

### Public Routes

Routes that don't require authentication:

```typescript
API_CONFIG.publicPaths = [
  '/api/health',
  '/api/public',
  '/api/auth',
  '/api/auth/sign-in',
  '/api/auth/sign-out'
]
```

### Protected Routes

Routes that require authentication:

```typescript
API_CONFIG.protectedPaths = [
  '/api/user',
  '/api/user/*',
  '/api/admin',
  '/api/admin/*',
  '/api/dashboard',
  '/api/dashboard/*'
]
```

### Rate Limiting

Default rate limits:

```typescript
API_CONFIG.rateLimit = {
  maxRequests: 100,        // 100 requests
  windowSeconds: 900,       // per 15 minutes
  
  routeLimits: {
    '/api/auth/*': {
      maxRequests: 10,       // 10 requests
      windowSeconds: 60       // per 1 minute
    },
    '/api/admin/*': {
      maxRequests: 50,       // 50 requests
      windowSeconds: 900      // per 15 minutes
    }
  }
}
```

### Security Headers

Default security headers:

```typescript
API_CONFIG.security = {
  csp: "default-src 'self'",
  frameOptions: 'DENY',
  nosniff: 'nosniff',
  xssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin'
}
```

---

## Error Handling

### Common HTTP Status Codes

| Status Code | Description | Example Scenario |
|-------------|-------------|------------------|
| 200 | OK | Successful request |
| 400 | Bad Request | Missing required parameters |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Response Format

All errors follow this format:

```json
{
  "statusCode": 401,
  "statusMessage": "Unauthorized",
  "message": "No token provided or token is invalid",
  "data": {
    "error": "auth_required",
    "details": "..."
  }
}
```

### Rate Limit Error (429)

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705330200

{
  "statusCode": 429,
  "statusMessage": "Too Many Requests",
  "message": "Rate limit exceeded",
  "data": {
    "error": "rate_limit_exceeded",
    "retryAfter": 60
  }
}
```

---

## Best Practices

### 1. Marking Routes as Public

```typescript
export default defineEventHandler(async (event) => {
  // Mark as public FIRST
  event.context.apiPublic = true
  
  // Rest of your code
})
```

### 2. Marking Routes as Protected

```typescript
export default defineEventHandler(async (event) => {
  // Mark as protected FIRST
  event.context.apiProtected = true
  
  // User is now available
  const user = event.context.user
})
```

### 3. Accessing User Data

```typescript
export default defineEventHandler(async (event) => {
  event.context.apiProtected = true
  
  const user = event.context.user
  
  if (!user) {
    throw createError({
      statusCode: 500,
      statusMessage: 'User context not available'
    })
  }
  
  // Use user data
  const userId = user.sub
  const email = user.email
})
```

### 4. Role-Based Authorization

```typescript
export default defineEventHandler(async (event) => {
  event.context.apiProtected = true
  const user = event.context.user
  
  const userRoles = (user.roles as string[]) || []
  const requiredRoles = ['admin', 'editor']
  
  const hasRequiredRole = requiredRoles.some(
    role => userRoles.includes(role)
  )
  
  if (!hasRequiredRole) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      data: {
        error: 'insufficient_permissions',
        userRoles,
        requiredRoles
      }
    })
  }
})
```

### 5. Using Rate Limit Config

```typescript
import { getRateLimitConfig } from '#utils/api-middleware-config'

export default defineEventHandler(async (event) => {
  const route = event.path
  const limits = getRateLimitConfig(route)
  
  console.log(`Max requests: ${limits.maxRequests}`)
  console.log(`Window: ${limits.windowSeconds}s`)
})
```

### 6. Dynamic Route Detection

```typescript
import { isPublicRoute, isProtectedRoute } from '#utils/api-middleware-config'

export default defineEventHandler(async (event) => {
  const route = event.path
  
  if (isPublicRoute(route)) {
    event.context.apiPublic = true
  } else if (isProtectedRoute(route)) {
    event.context.apiProtected = true
  }
})
```

### 7. Reading Rate Limit Headers

```typescript
export default defineEventHandler(async (event) => {
  const limit = event.node.res.getHeader('X-RateLimit-Limit')
  const remaining = event.node.res.getHeader('X-RateLimit-Remaining')
  const reset = event.node.res.getHeader('X-RateLimit-Reset')
  
  return {
    rateLimit: {
      limit: parseInt(limit),
      remaining: parseInt(remaining),
      reset: new Date(parseInt(reset) * 1000).toISOString()
    }
  }
})
```

---

## Testing the Examples

### 1. Test Health Check

```bash
curl http://localhost:3000/api/example/health
```

### 2. Test Public Endpoint

```bash
curl http://localhost:3000/api/example/public
```

### 3. Test User Profile (Protected)

```bash
# Get JWT token first from Logto
TOKEN="your_jwt_token"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/example/user/profile
```

### 4. Test Admin Endpoint

```bash
# Use admin JWT token
ADMIN_TOKEN="your_admin_jwt_token"

curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/example/admin/users
```

### 5. Test Login with Rate Limiting

```bash
# Make 11 requests (exceeds 10 req/min limit)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/example/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com","password":"password123"}'
  echo ""
done
```

### 6. Test Rate Limit Headers

```bash
TOKEN="your_jwt_token"

curl -I -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/example/rate-limited
```

---

## Summary

This middleware system provides:

✅ **Authentication** - JWT validation with Logto
✅ **Authorization** - Role-based access control
✅ **Rate Limiting** - Configurable per-route limits
✅ **Security Headers** - Automatic protection
✅ **Structured Logging** - Debugging and monitoring
✅ **Dynamic Configuration** - Centralized API config
✅ **Type Safety** - Full TypeScript support
✅ **Easy to Use** - Simple flag-based approach

For more information, see:
- Middleware files in `server/middleware/`
- Configuration in `server/utils/api-middleware-config.ts`
- Logger in `server/utils/logger.ts`
- Rate limiter in `server/utils/rate-limiter.ts`
