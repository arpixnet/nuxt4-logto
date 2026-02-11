# Logging Guide

This document provides comprehensive documentation for the logging system using Pino in Nuxt 4 application.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Server-Side Logging](#server-side-logging)
  - [Available Loggers](#available-loggers)
  - [Using Loggers](#using-loggers)
  - [Helper Functions](#helper-functions)
  - [Data Redaction](#data-redaction)
- [Client-Side Logging](#client-side-logging)
  - [useClientLogger Composable](#useclientlogger-composable)
  - [Logging Methods](#logging-methods)
  - [Configuration](#configuration)
- [Examples](#examples)
  - [1. Basic Server Logging](#1-basic-server-logging)
  - [2. Error Logging](#2-error-logging)
  - [3. Client Component Logging](#3-client-component-logging)
  - [4. Middleware Logging](#4-middleware-logging)
  - [5. Security Event Logging](#5-security-event-logging)
  - [6. Custom Context Logger](#6-custom-context-logger)
- [Best Practices](#best-practices)
- [Configuration](#configuration-1)
- [Troubleshooting](#troubleshooting)

---

## Overview

This application uses **Pino**, a fast and structured JSON logger for Node.js applications. The logging system provides:

- **Structured Logging** - JSON format for easy parsing and analysis
- **Contextual Loggers** - Pre-configured loggers for different parts of the application
- **Data Redaction** - Automatic redaction of sensitive information in production
- **Pretty Printing** - Human-readable logs in development
- **Client-Side Logging** - Send client logs to server for centralized monitoring
- **Performance** - Optimized for high throughput with minimal overhead

---

## Architecture

### Server-Side Logging

The server-side logging is centralized in `server/utils/logger.ts`:

```
server/utils/logger.ts
├── Main Logger
├── Specialized Child Loggers
│   ├── authLogger
│   ├── apiLogger
│   ├── sessionLogger
│   ├── rateLimitLogger
│   ├── dbLogger
│   ├── emailLogger
│   └── middlewareLogger
├── Helper Functions
│   ├── logError()
│   ├── logClientEvent()
│   └── createLogger()
└── Configuration
    ├── Transport (pino-pretty in dev)
    ├── Redaction rules
    └── Formatters
```

### Client-Side Logging

Client-side logging uses the `useClientLogger` composable:

```
app/composables/useClientLogger.ts
├── Development Mode
│   └── Console logging with emojis
└── Production Mode
    └── Send critical logs to /api/log endpoint
```

---

## Server-Side Logging

### Available Loggers

The following pre-configured loggers are available for different contexts:

| Logger | Context | Use Case |
|--------|---------|-----------|
| `logger` | Root logger | General logging |
| `authLogger` | auth | Authentication events, JWT validation |
| `apiLogger` | api | API endpoints, requests, responses |
| `sessionLogger` | session | Session management, cookies |
| `rateLimitLogger` | rate-limit | Rate limiting events, throttling |
| `dbLogger` | database | Database queries, connections |
| `emailLogger` | email | Email sending, notifications |
| `middlewareLogger` | middleware | Middleware execution, errors |

### Using Loggers

#### Basic Usage

```typescript
import { authLogger } from '#utils/logger'

// Simple logging
authLogger.info('User signed in')
authLogger.warn('Suspicious login attempt')
authLogger.error('Authentication failed')
```

#### Logging with Data

```typescript
import { authLogger } from '#utils/logger'

// Log with contextual data
authLogger.info(
  { 
    userId: 'user-123',
    email: 'user@example.com',
    provider: 'logto' 
  },
  'User signed in successfully'
)
```

#### Logging Levels

| Level | Use Case | Environment |
|-------|-----------|-------------|
| `debug` | Detailed debugging information | Development only |
| `info` | General informational messages | All environments |
| `warn` | Warning messages, recoverable issues | All environments |
| `error` | Error messages, exceptions | All environments |

### Helper Functions

#### logError()

Helper function for consistent error logging with stack traces:

```typescript
import { authLogger, logError } from '#utils/logger'

try {
  await authenticateUser(credentials)
} catch (error) {
  logError(authLogger, error, 'Authentication failed', {
    userId: 'user-123',
    attempt: 3
  })
  // error will be automatically formatted with:
  // - name, message, stack (in dev)
  // - Additional data from the third parameter
}
```

#### logClientEvent()

Helper function for logging events received from the client:

```typescript
import { logClientEvent } from '#utils/logger'

// Used in /api/log endpoint
logClientEvent(
  'error',              // level
  'auth-client',         // context
  'Login failed',         // message
  { error: err },         // data
  {                      // client info
    userAgent: req.headers['user-agent'],
    ip: req.headers['x-forwarded-for'],
    userId: 'user-123'
  }
)
```

#### createLogger()

Create a logger with custom context:

```typescript
import { createLogger } from '#utils/logger'

// Create logger for payment processing
const paymentLogger = createLogger('payment')

paymentLogger.info(
  { 
    amount: 99.99,
    currency: 'USD',
    paymentMethod: 'stripe' 
  },
  'Payment processed successfully'
)

// Logs will have context: 'payment'
```

### Data Redaction

Sensitive data is automatically redacted in production:

```typescript
// Redacted paths (production only)
const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'password',
  'token',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
  'sessionId'
]
```

**Example in Production:**

```typescript
import { apiLogger } from '#utils/logger'

apiLogger.info(
  {
    password: 'secret123',
    token: 'eyJhbGciOiJIUzI1NiIs...',
    apiKey: 'sk_live_12345'
  },
  'User login attempt'
)

// Output (sensitive data redacted):
// {
//   "level": "info",
//   "time": "2024-01-15T10:30:00.000Z",
//   "context": "api",
//   "msg": "User login attempt",
//   "password": "[REDACTED]",
//   "token": "[REDACTED]",
//   "apiKey": "[REDACTED]"
// }
```

---

## Client-Side Logging

### useClientLogger Composable

Client-side logging uses a composable that adapts to the environment:

```typescript
import { useClientLogger } from '#composables/useClientLogger'

const logger = useClientLogger()

// Development: logs to console with emojis
// Production: sends critical logs to server
```

### Logging Methods

#### debug()

Only logs in development, never sent to server:

```typescript
logger.debug('component', 'User clicked button', { 
  buttonId: 'submit-btn',
  timestamp: Date.now()
})
```

**Development Output:**
```
[component] 🔍 User clicked button { buttonId: 'submit-btn', timestamp: ... }
```

#### info()

Only logs in development:

```typescript
logger.info('navigation', 'User navigated to dashboard')
```

**Development Output:**
```
[navigation] ℹ️ User navigated to dashboard
```

#### warn()

Logs in development and sends to server in production:

```typescript
logger.warn('auth', 'Token expires soon', {
  expiresInSeconds: 300
})
```

**Development:** Console warning with emoji
**Production:** Sent to `/api/log` endpoint

#### error()

Always sent to server in production:

```typescript
logger.error('api', 'Failed to fetch user data', error, {
  endpoint: '/api/user/profile',
  userId: 'user-123'
})
```

**Development:** Console error with stack trace
**Production:** Sent to `/api/log` endpoint

#### security()

Always sent to server regardless of environment:

```typescript
logger.security('multiple_failed_logins', {
  email: 'user@example.com',
  attempts: 5
})
```

**Note:** Security events are logged at `warn` level and always sent to server.

### Configuration

#### Options

```typescript
const logger = useClientLogger({
  serverMinLevel: 'error',     // Minimum level to send to server
  includeUserInfo: true         // (deprecated - no longer used)
})
```

**serverMinLevel Options:**

| Level | Sent to Server? |
|-------|-----------------|
| `debug` | Debug, Info, Warn, Error |
| `info` | Info, Warn, Error |
| `warn` | Warn, Error (default) |
| `error` | Error only |

#### Environment Detection

The composable automatically detects the environment:

```typescript
const isDev = import.meta.dev

if (isDev) {
  // Log to console
  console.log(...)
} else {
  // Send to server
  await $fetch('/api/log', ...)
}
```

---

## Examples

### 1. Basic Server Logging

**File:** `server/api/example/health.get.ts`

```typescript
import { apiLogger } from '#utils/logger'

export default defineEventHandler(async (event) => {
  apiLogger.info({
    path: event.path,
    method: event.method
  }, 'Health check requested')

  return {
    status: 'ok',
    timestamp: new Date().toISOString()
  }
})
```

**Log Output (Development):**
```
[10:30:00.000] INFO (api): Health check requested
  path: "/api/example/health"
  method: "GET"
```

---

### 2. Error Logging

**File:** `server/api/example/user/profile.get.ts`

```typescript
import { apiLogger, logError } from '#utils/logger'

export default defineEventHandler(async (event) => {
  event.context.apiProtected = true
  const user = event.context.user

  try {
    const profile = await fetchUserProfile(user.sub)
    
    apiLogger.info({
      userId: user.sub,
      hasProfile: !!profile
    }, 'Profile fetched successfully')
    
    return profile
  } catch (error) {
    logError(apiLogger, error, 'Failed to fetch user profile', {
      userId: user.sub,
      endpoint: '/api/user/profile'
    })
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch profile'
    })
  }
})
```

**Log Output (Development):**
```
[10:30:00.000] ERROR (api): Failed to fetch user profile
  userId: "user-123"
  endpoint: "/api/user/profile"
  error: {
    name: "Error",
    message: "Database connection failed",
    stack: "Error: Database connection failed\n    at fetchUserProfile..."
  }
```

---

### 3. Client Component Logging

**File:** `app/components/layout/AuthUser.vue`

```typescript
<script setup lang="ts">
import { useClientLogger } from '#composables/useClientLogger'

const { session, isAuthenticated } = useAuthSession()
const clientLogger = useClientLogger()

const user = computed(() => session.value?.user)

// Log authentication status changes
watchEffect(() => {
  if (isAuthenticated.value && user.value) {
    clientLogger.debug('auth-user', 'Authenticated user rendered', {
      userId: user.value.sub,
      username: user.value.username
    })
  } else if (!isAuthenticated.value) {
    clientLogger.debug('auth-user', 'Not authenticated, showing login button')
  }
})

const userMenuItems = computed(() => [
  {
    label: 'Logout',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    onSelect: () => {
      clientLogger.info('auth-user', 'Logout button clicked', {
        userId: user.value?.sub
      })
    }
  }
])
</script>
```

---

### 4. Middleware Logging

**File:** `server/middleware/02-api-protected.ts`

```typescript
import { authLogger } from '../utils/logger'

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) {
    return
  }

  if (event.context.apiProtected !== true) {
    return
  }

  const logtoClient = event.context.logtoClient
  if (!logtoClient) {
    authLogger.error({
      path: event.path,
      method: event.method
    }, 'Auth context not initialized')
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }

  const token = getAuthToken(event)

  if (!token) {
    authLogger.warn({
      path: event.path,
      method: event.method,
      reason: 'missing_token'
    }, 'Authentication failed: No token provided')
    
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  try {
    const claims = await logtoClient.verifyToken(token)
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
      statusMessage: 'Unauthorized'
    })
  }
})
```

---

### 5. Security Event Logging

**Client-Side Security Logging:**

```typescript
<script setup lang="ts">
import { useClientLogger } from '#composables/useClientLogger'

const clientLogger = useClientLogger()

// Log suspicious login attempts
const handleLoginAttempt = async (credentials) => {
  const attempts = await getFailedLoginAttempts(credentials.email)
  
  if (attempts >= 5) {
    // Always log security events to server
    clientLogger.security('account_locked_due_to_attempts', {
      email: credentials.email,
      attempts,
      ip: await getClientIP()
    })
    
    throw new Error('Account temporarily locked')
  }
  
  // Normal login flow
}
</script>
```

**Server-Side Security Logging:**

```typescript
import { authLogger } from '#utils/logger'

export default defineEventHandler(async (event) => {
  event.context.apiProtected = true
  const user = event.context.user
  
  const suspiciousActivity = detectSuspiciousActivity(event, user)
  
  if (suspiciousActivity) {
    authLogger.warn({
      userId: user.sub,
      activityType: suspiciousActivity.type,
      ip: getClientIp(event),
      userAgent: getRequestHeader(event, 'user-agent')
    }, 'Suspicious activity detected')
  }
})
```

---

### 6. Custom Context Logger

Creating a custom logger for a specific feature:

```typescript
import { createLogger } from '#utils/logger'

// Create logger for payment processing
const paymentLogger = createLogger('payment')

export default defineEventHandler(async (event) => {
  const { amount, currency, paymentMethod } = await readBody(event)
  
  paymentLogger.info({
    amount,
    currency,
    paymentMethod,
    userId: event.context.user?.sub
  }, 'Payment initiated')
  
  try {
    const result = await processPayment({ amount, currency, paymentMethod })
    
    paymentLogger.info({
      paymentId: result.id,
      status: result.status,
      userId: event.context.user?.sub
    }, 'Payment completed successfully')
    
    return result
  } catch (error) {
    logError(paymentLogger, error, 'Payment processing failed', {
      amount,
      currency,
      userId: event.context.user?.sub
    })
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Payment failed'
    })
  }
})
```

---

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ✅ Good - Use correct level
apiLogger.debug('Detailed debugging info', { userId: '123' })
apiLogger.info('User logged in', { userId: '123' })
apiLogger.warn('Token expires soon', { expiresIn: 300 })
apiLogger.error('Authentication failed', { error: err })

// ❌ Bad - Using error for recoverable issues
apiLogger.error('User attempted login with wrong password') // Should be warn
```

### 2. Include Relevant Context

```typescript
// ✅ Good - Include relevant context
authLogger.info(
  {
    userId: user.sub,
    email: user.email,
    provider: 'logto',
    ip: getClientIp(event)
  },
  'User signed in'
)

// ❌ Bad - Missing context
authLogger.info('User signed in') // No information about which user
```

### 3. Structured Data

```typescript
// ✅ Good - Structured data
apiLogger.info({
    userId: '123',
    action: 'create_project',
    projectId: 'abc',
    metadata: {
      name: 'My Project',
      visibility: 'private'
    }
  },
  'Project created')

// ❌ Bad - Unstructured message
apiLogger.info('User 123 created project abc named My Project with visibility private')
```

### 4. Error Handling

```typescript
// ✅ Good - Use logError helper
try {
  await riskyOperation()
} catch (error) {
  logError(apiLogger, error, 'Operation failed', {
    userId: '123',
    operation: 'riskyOperation'
  })
}

// ❌ Bad - Manual error formatting
try {
  await riskyOperation()
} catch (error) {
  apiLogger.error({
    message: error?.message,
    stack: error?.stack
  }, 'Operation failed')
}
```

### 5. Client Logging

```typescript
// ✅ Good - Send only critical logs to server
const logger = useClientLogger({ serverMinLevel: 'error' })

logger.debug('debug', 'User clicked button') // Console only
logger.info('info', 'Navigation event') // Console only
logger.warn('warn', 'API slow') // Console + server in prod
logger.error('error', 'API failed', err) // Always sent

// ❌ Bad - Sending all logs to server
const logger = useClientLogger({ serverMinLevel: 'debug' })
logger.debug('debug', 'User moved mouse') // Spams server
```

### 6. Avoid Logging Sensitive Data

```typescript
// ✅ Good - Sensitive data will be auto-redacted
authLogger.info({
  email: user.email,           // OK - not in redact paths
  userId: user.sub,             // OK
  // password: user.password      // Will be redacted in production
  // token: user.accessToken       // Will be redacted in production
}, 'User authenticated')

// ❌ Bad - Manually including secrets
authLogger.info({
  apiKey: process.env.API_KEY,  // Will be redacted
  dbPassword: process.env.DB_PASS  // Will be redacted
}, 'Database connected')
```

### 7. Performance Considerations

```typescript
// ✅ Good - Log before/after expensive operations
apiLogger.debug({ userId: '123' }, 'Fetching user data')

const userData = await expensiveOperation(userId)

apiLogger.debug({
    userId: '123',
    duration: Date.now() - startTime
  }, 'User data fetched')

// ❌ Bad - Logging huge objects
apiLogger.debug({ 
  entireResponseHugeObject: data // Don't log entire responses
}, 'API response')
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment (development/production) |
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | Minimum log level |

### Logger Configuration

**File:** `server/utils/logger.ts`

```typescript
const baseConfig = {
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  formatters: {
    level: (label: string) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: isDev ? [] : redactPaths
}

const transportConfig = isDev
  ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
        colorize: true,
        singleLine: false,
        messageFormat: '{msg}'
      }
    }
  : undefined
```

### Customizing Redaction

Add additional paths to redact in production:

```typescript
const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'password',
  'token',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
  'sessionId',
  // Add custom paths
  'creditCard.number',
  'ssn',
  'bankAccount'
]
```

---

## Troubleshooting

### Logs Not Appearing

**Problem:** Logs are not showing in console or files.

**Solutions:**

1. **Check log level:**
```typescript
// Ensure your log level is >= configured minimum
apiLogger.debug('debug message') // Won't show if LOG_LEVEL=info
```

2. **Check environment:**
```typescript
const isDev = process.env.NODE_ENV !== 'production'
// pino-pretty only used in development
```

3. **Verify logger import:**
```typescript
// ✅ Correct
import { authLogger } from '#utils/logger'

// ❌ Wrong - path should use # alias
import { authLogger } from '../utils/logger'
```

### Pretty Printing Not Working

**Problem:** Logs are not pretty-printed in development.

**Solution:** Ensure `pino-pretty` is installed:

```bash
npm install pino-pretty --save-dev
```

### Client Logs Not Sent to Server

**Problem:** Client logs are not appearing on server.

**Solutions:**

1. **Check serverMinLevel:**
```typescript
// Ensure serverMinLevel allows the level
const logger = useClientLogger({ serverMinLevel: 'error' })
logger.warn('warning') // Won't be sent if serverMinLevel='error'
```

2. **Check /api/log endpoint:**
```bash
curl -X POST http://localhost:3000/api/log \
  -H "Content-Type: application/json" \
  -d '{"level":"error","context":"test","message":"test log"}'
```

3. **Check rate limiting:**
```typescript
// Client logs are rate limited to 50/minute
// Check if rate limit is exceeded
```

### Sensitive Data in Logs

**Problem:** Seeing sensitive data in logs.

**Solutions:**

1. **Ensure production mode:**
```typescript
// Redaction only applies in production
const isDev = process.env.NODE_ENV !== 'production'
```

2. **Add custom redaction paths:**
```typescript
// Add the path to redactPaths array
const redactPaths = [
  // ...existing paths...
  'mySensitiveField'
]
```

### Performance Issues

**Problem:** Logging is slowing down the application.

**Solutions:**

1. **Reduce log level in production:**
```bash
export LOG_LEVEL=warn
```

2. **Avoid logging large objects:**
```typescript
// ❌ Bad
apiLogger.info({ hugeData: entireResponse })

// ✅ Good
apiLogger.info({ 
  userId: user.id,
  size: entireResponse.length 
}, 'Data fetched')
```

3. **Use pino transport for async logging:**
```typescript
// Pino already uses async transport by default
// Logs are written asynchronously without blocking
```

---

## Summary

This logging system provides:

✅ **Structured Logging** - JSON format for easy parsing
✅ **Contextual Loggers** - Pre-configured loggers for different parts
✅ **Data Redaction** - Automatic redaction in production
✅ **Pretty Printing** - Human-readable logs in development
✅ **Client-Side Logging** - Centralized logging from frontend
✅ **Performance** - Optimized for high throughput
✅ **Type Safety** - Full TypeScript support
✅ **Helper Functions** - Consistent error logging

For more information, see:
- Logger implementation: `server/utils/logger.ts`
- Client logger: `app/composables/useClientLogger.ts`
- Log endpoint: `server/api/log.post.ts`
- Pino documentation: https://getpino.io/
- Pino Pretty: https://github.com/pinojs/pino-pretty
