# Rate Limiter Guide

This document provides comprehensive documentation for the rate limiting system using `rate-limiter-flexible` with Redis and in-memory fallback.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
  - [Per-User Rate Limiting](#per-user-rate-limiting)
  - [IP-Based Rate Limiting](#ip-based-rate-limiting)
  - [Development Tools](#development-tools)
- [API Reference](#api-reference)
- [Implemented Endpoints](#implemented-endpoints)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The rate limiter is built on `rate-limiter-flexible`, a battle-tested Node.js library that provides:

- **Redis-First Storage** - Distributed rate limiting across multiple servers
- **In-Memory Fallback** - Automatic fallback when Redis is unavailable
- **Insurance Limiter** - Memory limiter acts as backup during Redis issues
- **Per-User Rate Limiting** - Rate limit by user ID, not just IP address
- **Flexible Configuration** - Different limits per operation type

### Key Features

- Fail-open design - If rate limiter fails, requests are allowed
- Type-safe TypeScript implementation
- Integrated logging with `rateLimitLogger`
- Development endpoints for clearing rate limits

---

## Architecture

### Rate Limiting Flow

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  checkRateLimit({ key, points, duration })
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Redis Available?               │
└──────┬──────────────────────────┘
       │
   ┌───┴───┐
   │       │
  YES       NO
   │       │
   ▼       ▼
┌─────────────┐  ┌─────────────────┐
│ RateLimiter │  │ RateLimiter     │
│ Redis       │  │ Memory          │
│ + Insurance │  │ (standalone)    │
└──────┬──────┘  └────────┬────────┘
       │                   │
       └───────┬───────────┘
               │
               ▼
┌─────────────────────────────────┐
│  consume(key)                   │
│  - Increment counter            │
│  - Check against limit          │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Return RateLimitResult         │
│  - allowed: boolean             │
│  - remaining: number            │
│  - resetAt: timestamp           │
│  - msBeforeNext: number         │
└─────────────────────────────────┘
```

### Storage Options

| Storage | Use Case | Pros | Cons |
|---------|----------|------|------|
| **Redis** | Production | Distributed, persistent | Requires Redis server |
| **In-Memory** | Development/Fallback | No dependencies | Not distributed, resets on restart |

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis server host |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_PASSWORD` | (none) | Optional Redis password |

### Redis Connection

The rate limiter automatically initializes Redis on module load:

```typescript
// server/utils/rate-limiter.ts
redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
})
```

---

## Usage

### Basic Usage

```typescript
import { checkRateLimit, throwRateLimitError } from '~/server/utils/rate-limiter'

export default defineEventHandler(async (event) => {
  const result = await checkRateLimit({
    key: 'my-operation:user123',
    points: 10,        // Maximum 10 requests
    duration: 60       // Per 60 seconds
  })

  if (!result.allowed) {
    throwRateLimitError(result)
  }

  // Continue with endpoint logic
  return { success: true }
})
```

### Per-User Rate Limiting

For user-specific operations, use the user ID in the key:

```typescript
import { checkRateLimit, throwRateLimitError } from '~/server/utils/rate-limiter'

export default defineEventHandler(async (event) => {
  const userId = event.context.logtoUser?.sub

  // Each user gets their own rate limit
  const result = await checkRateLimit({
    key: `account-delete:${userId}`,
    points: 3,         // 3 attempts
    duration: 3600     // Per hour
  })

  if (!result.allowed) {
    throwRateLimitError(result)
  }

  // Process account deletion
})
```

### IP-Based Rate Limiting

For general rate limiting, use the client IP:

```typescript
import { checkRateLimit, throwRateLimitError, getClientIP } from '~/server/utils/rate-limiter'

export default defineEventHandler(async (event) => {
  const ip = getClientIP(event)

  const result = await checkRateLimit({
    key: `api:${ip}`,
    points: 100,       // 100 requests
    duration: 900      // Per 15 minutes
  })

  if (!result.allowed) {
    throwRateLimitError(result)
  }

  // Continue processing
})
```

### Development Tools

Clear rate limits during development:

```bash
# Clear all rate limits
curl -X POST http://localhost:3000/api/dev/rate-limit/clear

# Clear specific key
curl -X POST http://localhost:3000/api/dev/rate-limit/clear \
  -H "Content-Type: application/json" \
  -d '{"key": "account-delete:user123"}'
```

---

## API Reference

### checkRateLimit(config)

Check if a request should be rate limited.

```typescript
interface RateLimitConfig {
  /** Unique key for rate limiting (e.g., 'operation:userId') */
  key: string
  /** Maximum number of requests allowed */
  points: number
  /** Duration in seconds */
  duration: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
  msBeforeNext: number
}

async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | `string` | Yes | Unique identifier (e.g., `account-delete:userId123`) |
| `points` | `number` | Yes | Maximum requests allowed |
| `duration` | `number` | Yes | Time window in seconds |

**Returns:** `Promise<RateLimitResult>`

**Example:**

```typescript
const result = await checkRateLimit({
  key: `password-change:${userId}`,
  points: 5,
  duration: 900  // 15 minutes
})

if (!result.allowed) {
  // Rate limit exceeded
  console.log(`Try again in ${result.msBeforeNext / 1000} seconds`)
}
```

### throwRateLimitError(result)

Throw a 429 Too Many Requests error.

```typescript
function throwRateLimitError(result: RateLimitResult): never
```

**Throws:**

```json
{
  "statusCode": 429,
  "statusMessage": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again in 5 minutes.",
  "data": {
    "limit": 3,
    "remaining": 0,
    "resetAt": 1698765432
  }
}
```

### getClientIP(event)

Extract client IP address from request headers.

```typescript
function getClientIP(event: H3Event): string
```

**IP Detection Order:**
1. `x-forwarded-for` header (first IP in list)
2. `x-real-ip` header
3. `socket.remoteAddress`

### clearRateLimit(key)

Clear rate limit for a specific key (development only).

```typescript
async function clearRateLimit(key: string): Promise<{ success: boolean }>
```

### clearAllRateLimits()

Clear all rate limits (development only).

```typescript
async function clearAllRateLimits(): Promise<{ count: number }>
```

---

## Implemented Endpoints

The following endpoints have rate limiting implemented:

| Endpoint | Key Pattern | Points | Duration | Purpose |
|----------|-------------|--------|----------|---------|
| `DELETE /api/profile/account` | `account-delete:{userId}` | 3 | 3600s (1h) | Account deletion |
| `PATCH /api/profile/password` | `password-change:{userId}` | 5 | 900s (15min) | Password change |
| `DELETE /api/profile/mfa/totp` | `totp-disable:{userId}` | 5 | 900s (15min) | Disable 2FA |
| `POST /api/log` | `client-log:{ip}` | 50 | 60s (1min) | Client logs |
| All `/api/*` routes | `api:{ip}` | 100 | 900s (15min) | General API |

---

## Best Practices

### 1. Use Per-User Rate Limiting for Sensitive Operations

```typescript
// ✅ Good - Each user has their own limit
await checkRateLimit({
  key: `account-delete:${userId}`,
  points: 3,
  duration: 3600
})

// ❌ Bad - All users share same limit by IP
await checkRateLimit({
  key: `account-delete:${ip}`,
  points: 3,
  duration: 3600
})
```

### 2. Choose Appropriate Limits

| Operation Type | Recommended Points | Duration |
|----------------|-------------------|----------|
| Account deletion | 3-5 | 1 hour |
| Password change | 5 | 15 minutes |
| 2FA operations | 5 | 15 minutes |
| General API | 100 | 15 minutes |
| Search/Query | 30-60 | 1 minute |

### 3. Include Operation Type in Key

```typescript
// ✅ Good - Separate limits per operation
key: `password-change:${userId}`
key: `totp-disable:${userId}`
key: `email-verify:${userId}`

// ❌ Bad - Same limit for all operations
key: `user:${userId}`
```

### 4. Handle Rate Limit Errors Gracefully

```typescript
const result = await checkRateLimit({ key, points, duration })

if (!result.allowed) {
  // Use throwRateLimitError for consistent error format
  throwRateLimitError(result)
}
```

### 5. Log Rate Limit Events

The rate limiter automatically logs:
- Rate limit exceeded (WARN level)
- Redis connection issues (WARN level)
- Redis reconnection (INFO level)

---

## Troubleshooting

### Redis Not Connecting

1. **Check Redis is running:**
   ```bash
   redis-cli ping
   # Expected: PONG
   ```

2. **Check environment variables:**
   ```bash
   echo $REDIS_HOST
   echo $REDIS_PORT
   ```

3. **Check logs:**
   ```
   WARN (rate-limit): Redis connection failed, using in-memory fallback
   ```

### Rate Limit Not Working

1. **Verify the key is unique per user/operation**

2. **Clear rate limits and test:**
   ```bash
   curl -X POST http://localhost:3000/api/dev/rate-limit/clear
   ```

3. **Check Redis for keys:**
   ```bash
   redis-cli KEYS "ratelimit:*"
   ```

### Rate Limit Exceeded on First Attempt

This typically means:
1. Previous attempts were made within the window
2. Redis has persistent data from previous sessions
3. Multiple users sharing the same IP (if using IP-based limiting)

**Solution:** Clear rate limits or use per-user keys:
```bash
curl -X POST http://localhost:3000/api/dev/rate-limit/clear
```

---

## Summary

| Feature | Implementation |
|---------|---------------|
| **Library** | `rate-limiter-flexible` |
| **Primary Storage** | Redis |
| **Fallback Storage** | In-Memory |
| **Per-User Limiting** | ✅ Via unique keys |
| **IP-Based Limiting** | ✅ Via `getClientIP()` |
| **Development Tools** | Clear endpoints |
| **Logging** | `rateLimitLogger` |
| **Error Handling** | `throwRateLimitError()` |

For more information:
- Implementation: `server/utils/rate-limiter.ts`
- Middleware: `server/middleware/01-api-auth.ts`
- Library: [rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible)
