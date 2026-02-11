# Rate Limiter Guide

This document provides comprehensive documentation for the rate limiting system using Redis with in-memory fallback.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Redis Configuration](#redis-configuration)
  - [Default Settings](#default-settings)
- [Usage Patterns](#usage-patterns)
  - [Automatic Rate Limiting (Middleware)](#automatic-rate-limiting-middleware)
  - [Custom Rate Limiting (Endpoint Level)](#custom-rate-limiting-endpoint-level)
  - [Public Routes](#public-routes)
  - [Different Limits per Endpoint](#different-limits-per-endpoint)
- [API Reference](#api-reference)
  - [checkRateLimit()](#checkratelimit)
  - [throwRateLimitError()](#throwratelimiterror)
  - [RateLimitConfig](#ratelimitconfig)
  - [RateLimitResult](#ratelimitresult)
- [Examples](#examples)
  - [1. Default Rate Limiting](#1-default-rate-limiting)
  - [2. Custom Rate Limiting](#2-custom-rate-limiting)
  - [3. Different Limits by User Role](#3-different-limits-by-user-role)
  - [4. Rate Limit by IP Address](#4-rate-limit-by-ip-address)
  - [5. Public Route Without Rate Limit](#5-public-route-without-rate-limit)
  - [6. Reading Rate Limit Headers](#6-reading-rate-limit-headers)
- [Redis vs In-Memory](#redis-vs-in-memory)
  - [When Each is Used](#when-each-is-used)
  - [Automatic Reconnection](#automatic-reconnection)
  - [Detecting Storage Mode](#detecting-storage-mode)
- [Response Headers](#response-headers)
  - [Header Values](#header-values)
  - [Frontend Implementation](#frontend-implementation)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The rate limiter provides production-ready API rate limiting with:

- **Redis-First Architecture** - Uses Redis for distributed systems
- **In-Memory Fallback** - Automatic fallback when Redis is unavailable
- **Automatic Reconnection** - Reconnects to Redis every 30 seconds when unavailable
- **Standard Headers** - X-RateLimit-* headers in all responses
- **IP Detection** - Support for proxies (x-forwarded-for, x-real-ip)
- **Custom Identifiers** - Can use userId, API key, or other identifiers
- **Integrated Logging** - All events logged with rateLimitLogger

### Key Features

✅ **Fail-Open Design** - If rate limiting fails, requests are allowed (never blocks production)  
✅ **Distributed Support** - Redis allows multiple servers to share rate limit state  
✅ **Development Friendly** - Works without Redis using in-memory storage  
✅ **Type Safe** - Full TypeScript support with strict types  
✅ **Flexible Configuration** - Customize limits per endpoint or user role  

---

## Architecture

### Rate Limiting Flow

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  01-api-auth middleware   │
│  - Apply rate limiting     │
│  - Add headers            │
└──────┬────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  checkRateLimit()         │
│  - Get identifier (IP)    │
└──────┬────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   Redis Available?        │
└──────┬────────────────────┘
       │
   ┌───┴───┐
   │       │
  YES       NO
   │       │
   ▼       ▼
┌───────┐ ┌──────────┐
│ Redis │ │ In-Memory │
│ store │ │  fallback │
└───┬───┘ └────┬─────┘
    │           │
    ▼           ▼
┌────────────────────────┐
│  Check count + TTL   │
│  Update counters     │
└────────┬───────────┘
         │
         ▼
┌────────────────────────┐
│  Return result       │
│  - allowed?         │
│  - remaining        │
│  - resetAt          │
└────────┬───────────┘
         │
         ▼
┌────────────────────────┐
│  Add headers        │
│  - X-RateLimit-Limit│
│  - X-RateLimit-Rem. │
│  - X-RateLimit-Reset│
└────────┬───────────┘
         │
         ▼
┌────────────────────────┐
│  If !allowed:        │
│    Throw 429 error    │
└────────────────────────┘
```

### Storage Options

#### Redis Storage (Primary)

**Used when:** Redis is available and connected

**Advantages:**
- Distributed across multiple servers
- Persistent storage
- Shared rate limit state
- Better for production

**Key Format:** `ratelimit:{identifier}`

**Example:**
```
ratelimit:192.168.1.1
ratelimit:user-123
ratelimit:api-key-abc
```

#### In-Memory Storage (Fallback)

**Used when:** Redis is unavailable or not configured

**Advantages:**
- Works without Redis
- Faster local access
- Good for development

**Disadvantages:**
- Not distributed
- Resets on server restart
- Per-server limits only

**Cleanup:** Old entries are cleaned every 5 minutes

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis server host |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_PASSWORD` | (none) | Optional Redis password |

### Redis Configuration

**File:** `server/utils/rate-limiter.ts`

```typescript
const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 3) {
      // Start periodic reconnection after 3 failed retries
      useRedis = false
      startReconnectionAttempts()
      return null
    }
    return Math.min(times * 100, 2000)
  }
}

// Optional password
if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD
}
```

**Reconnection Strategy:**
- Initial connection: Retry up to 3 times with exponential backoff
- After 3 failures: Fallback to in-memory, start periodic reconnection
- Periodic reconnection: Every 30 seconds
- On successful reconnection: Switch back to Redis, stop periodic attempts

### Default Settings

**Middleware Default:** `server/middleware/01-api-auth.ts`

```typescript
await applyRateLimiting(event, {
  maxRequests: 100,      // Maximum requests
  windowSeconds: 900      // 15 minutes
})
```

**Rate Limit Calculation:**
- **Requests allowed:** 100 per 15 minutes
- **Average rate:** ~0.11 requests/second
- **Burst capacity:** Up to 100 requests in short time
- **Reset time:** Every 15 minutes from first request

**Common Rate Limits:**

| Use Case | Max Requests | Window | Rate |
|----------|--------------|---------|-------|
| Public API | 100 | 15 min | ~0.11/sec |
| Authenticated API | 1000 | 15 min | ~1.11/sec |
| Upload endpoint | 5 | 1 min | 0.08/sec |
| Admin API | 2000 | 1 hour | ~0.56/sec |

---

## Usage Patterns

### Automatic Rate Limiting (Middleware)

The rate limiter is automatically applied to all API routes via middleware.

**File:** `server/middleware/01-api-auth.ts`

```typescript
export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) {
    return
  }

  // Apply rate limiting to all API routes
  await applyRateLimiting(event)
})
```

**Behavior:**
- Automatically applied to `/api/*` routes
- Uses default configuration (100 req/15 min)
- Adds rate limit headers to response
- Throws 429 error when limit exceeded

### Custom Rate Limiting (Endpoint Level)

For custom rate limits per endpoint, don't use the middleware default.

**File:** `server/api/custom-endpoint.post.ts`

```typescript
import { checkRateLimit, throwRateLimitError } from '#utils/rate-limiter'

export default defineEventHandler(async (event) => {
  // Skip default middleware rate limiting
  // Apply custom rate limit
  const result = await checkRateLimit(event, {
    maxRequests: 10,
    windowSeconds: 60  // 1 minute
  })

  if (!result.allowed) {
    throwRateLimitError(result)
  }

  // Endpoint logic...
  return { message: 'Success' }
})
```

### Public Routes

To exempt a route from rate limiting:

**File:** `server/api/public.get.ts`

```typescript
export default defineEventHandler(async (event) => {
  // Mark as public - skips rate limiting
  event.context.apiPublic = true

  // No rate limiting applied
  return { message: 'Public endpoint' }
})
```

**Or in middleware:**

```typescript
// Check before rate limiting
if (event.context.apiPublic === true) {
  // Add security headers but skip rate limiting
  addSecurityHeaders(event)
  return
}
```

### Different Limits per Endpoint

Apply different limits based on endpoint characteristics:

**File:** `server/api/upload.post.ts`

```typescript
import { checkRateLimit, throwRateLimitError } from '#utils/rate-limiter'

export default defineEventHandler(async (event) => {
  event.context.apiProtected = true
  const user = event.context.user

  // Stricter limit for uploads
  const result = await checkRateLimit(event, {
    maxRequests: 5,           // Only 5 uploads
    windowSeconds: 60,        // Per minute
    identifier: `upload:${user.sub}` // Separate limit from other endpoints
  })

  if (!result.allowed) {
    throwRateLimitError(result)
  }

  // Upload logic...
})
```

---

## API Reference

### checkRateLimit()

Check if a request should be rate limited.

```typescript
async function checkRateLimit(
  event: H3Event,
  config: RateLimitConfig
): Promise<RateLimitResult>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|--------|-----------|-------------|
| `event` | `H3Event` | Yes | Nuxt H3 event object |
| `config` | `RateLimitConfig` | Yes | Rate limit configuration |

**Returns:** `Promise<RateLimitResult>`

**Throws:** Never - always returns a result

**Behavior:**
1. Extracts identifier from IP or custom config
2. Checks Redis if available, otherwise in-memory
3. Updates request count
4. Returns result with allowance status

**Example:**

```typescript
import { checkRateLimit } from '#utils/rate-limiter'

const result = await checkRateLimit(event, {
  maxRequests: 100,
  windowSeconds: 900
})

if (!result.allowed) {
  throwRateLimitError(result)
}

console.log(`Remaining: ${result.remaining}`)
console.log(`Resets at: ${result.resetAt}`)
```

### throwRateLimitError()

Throw a 429 error with rate limit information.

```typescript
function throwRateLimitError(result: RateLimitResult): never
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|--------|-----------|-------------|
| `result` | `RateLimitResult` | Yes | Result from checkRateLimit |

**Returns:** Never (always throws)

**Error Details:**

- **Status Code:** 429 (Too Many Requests)
- **Status Message:** "Too Many Requests"
- **Message:** Human-readable with time until reset
- **Data:** Full rate limit information

**Example:**

```typescript
import { checkRateLimit, throwRateLimitError } from '#utils/rate-limiter'

const result = await checkRateLimit(event, {
  maxRequests: 100,
  windowSeconds: 900
})

if (!result.allowed) {
  throwRateLimitError(result)
  // Throws:
  // {
  //   statusCode: 429,
  //   statusMessage: "Too Many Requests",
  //   message: "Rate limit exceeded. Please try again in 12 minutes.",
  //   data: {
  //     limit: 100,
  //     remaining: 0,
  //     resetAt: 1698765432,
  //     resetDate: "2024-10-30T15:30:32.000Z"
  //   }
  // }
}
```

### RateLimitConfig

Configuration for rate limiting.

```typescript
interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in time window
   */
  maxRequests: number

  /**
   * Time window in seconds
   */
  windowSeconds: number

  /**
   * Custom identifier (defaults to IP address)
   */
  identifier?: string
}
```

**Properties:**

| Property | Type | Required | Default | Description |
|----------|--------|-----------|----------|-------------|
| `maxRequests` | `number` | Yes | - | Maximum requests allowed |
| `windowSeconds` | `number` | Yes | - | Time window in seconds |
| `identifier` | `string` | No | Client IP | Custom identifier |

**Examples:**

```typescript
// Default (IP-based)
{
  maxRequests: 100,
  windowSeconds: 900
}

// User-based
{
  maxRequests: 1000,
  windowSeconds: 900,
  identifier: `user:${user.sub}`
}

// API key-based
{
  maxRequests: 500,
  windowSeconds: 3600,
  identifier: `apikey:${apiKey}`
}

// Endpoint-specific
{
  maxRequests: 10,
  windowSeconds: 60,
  identifier: `upload:${user.sub}`
}
```

### RateLimitResult

Result from rate limit check.

```typescript
interface RateLimitResult {
  /**
   * Whether request is allowed
   */
  allowed: boolean

  /**
   * Number of requests remaining in current window
   */
  remaining: number

  /**
   * Timestamp when rate limit resets (Unix timestamp in seconds)
   */
  resetAt: number

  /**
   * Total number of requests allowed in window
   */
  limit: number
}
```

**Properties:**

| Property | Type | Description |
|----------|--------|-------------|
| `allowed` | `boolean` | Whether request is allowed |
| `remaining` | `number` | Requests remaining (0 if exceeded) |
| `resetAt` | `number` | Unix timestamp when limit resets |
| `limit` | `number` | Maximum requests allowed |

**Example:**

```typescript
{
  allowed: true,
  remaining: 45,
  resetAt: 1698765432,
  limit: 100
}

// Reset date
const resetDate = new Date(result.resetAt * 1000)
// Date: 2024-10-30T15:30:32.000Z
```

---

## Examples

### 1. Default Rate Limiting

Using the middleware default rate limiting (100 req/15 min):

**File:** `server/api/example/default.get.ts`

```typescript
export default defineEventHandler(async (event) => {
  // Rate limiting applied automatically by middleware
  // No additional code needed

  return {
    message: 'Rate limited endpoint',
    timestamp: new Date().toISOString()
  }
})
```

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1698765432
```

### 2. Custom Rate Limiting

Applying stricter limits for a sensitive endpoint:

**File:** `server/api/example/sensitive.post.ts`

```typescript
import { checkRateLimit, throwRateLimitError } from '#utils/rate-limiter'

export default defineEventHandler(async (event) => {
  event.context.apiProtected = true
  const user = event.context.user

  // Strict rate limit: 5 requests per minute
  const result = await checkRateLimit(event, {
    maxRequests: 5,
    windowSeconds: 60,
    identifier: `sensitive:${user.sub}`
  })

  if (!result.allowed) {
    throwRateLimitError(result)
  }

  // Sensitive operation...
  return { message: 'Operation completed' }
})
```

### 3. Different Limits by User Role

Applying different limits based on user role:

**File:** `server/api/example/endpoint.get.ts`

```typescript
import { checkRateLimit, throwRateLimitError } from '#utils/rate-limiter'

export default defineEventHandler(async (event) => {
  event.context.apiProtected = true
  const user = event.context.user

  // Get user role (from database, JWT claims, etc.)
  const userRole = user.role || 'user'

  // Different limits per role
  const limits = {
    admin: { maxRequests: 2000, windowSeconds: 3600 },
    premium: { maxRequests: 1000, windowSeconds: 3600 },
    user: { maxRequests: 100, windowSeconds: 900 }
  }

  const config = limits[userRole as keyof typeof limits]

  const result = await checkRateLimit(event, {
    ...config,
    identifier: `${userRole}:${user.sub}`
  })

  if (!result.allowed) {
    throwRateLimitError(result)
  }

  return { message: 'Success' }
})
```

### 4. Rate Limit by IP Address

Using IP-based rate limiting (default behavior):

**File:** `server/api/example/by-ip.get.ts`

```typescript
import { checkRateLimit, throwRateLimitError } from '#utils/rate-limiter'

export default defineEventHandler(async (event) => {
  // Uses IP address automatically (no identifier specified)
  const result = await checkRateLimit(event, {
    maxRequests: 50,
    windowSeconds: 60
  })

  if (!result.allowed) {
    throwRateLimitError(result)
  }

  return { message: 'IP-based rate limit applied' }
})
```

**IP Detection Order:**
1. `x-forwarded-for` header (for proxies)
2. `x-real-ip` header (for proxies)
3. `socket.remoteAddress` (direct connection)

### 5. Public Route Without Rate Limit

Exempting a public endpoint from rate limiting:

**File:** `server/api/example/public.get.ts`

```typescript
export default defineEventHandler(async (event) => {
  // Mark as public - skips middleware rate limiting
  event.context.apiPublic = true

  // No rate limiting applied
  // Only security headers added

  return {
    message: 'Public endpoint',
    features: ['No rate limit', 'Security headers only']
  }
})
```

### 6. Reading Rate Limit Headers

Reading rate limit headers in frontend:

**File:** `app/components/RateLimitStatus.vue`

```typescript
<script setup lang="ts">
import { useFetch } from '#app'

const { data, error } = await useFetch('/api/example/endpoint')

const rateLimit = computed(() => {
  if (!data.value) return null

  return {
    limit: data.value.headers?.['x-ratelimit-limit'],
    remaining: data.value.headers?.['x-ratelimit-remaining'],
    resetAt: data.value.headers?.['x-ratelimit-reset'],
    resetDate: data.value.headers?.['x-ratelimit-reset']
      ? new Date(parseInt(data.value.headers['x-ratelimit-reset']) * 1000)
      : null
  }
})

const remainingPercentage = computed(() => {
  if (!rateLimit.value) return 0
  const total = parseInt(rateLimit.value.limit || '0')
  const remaining = parseInt(rateLimit.value.remaining || '0')
  return (remaining / total) * 100
})
</script>

<template>
  <div v-if="rateLimit" class="rate-limit-status">
    <div class="progress-bar">
      <div 
        class="progress-fill"
        :style="{ width: remainingPercentage + '%' }"
        :class="{ warning: remainingPercentage < 20, error: remainingPercentage === 0 }"
      />
    </div>
    <p>{{ rateLimit.remaining }} / {{ rateLimit.limit }} requests remaining</p>
    <p v-if="rateLimit.resetDate">
      Resets at: {{ rateLimit.resetDate.toLocaleString() }}
    </p>
  </div>
</template>

<style scoped>
.rate-limit-status {
  padding: 1rem;
  border-radius: 0.5rem;
  background: #f3f4f6;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: #10b981;
  transition: width 0.3s ease;
}

.progress-fill.warning {
  background: #f59e0b;
}

.progress-fill.error {
  background: #ef4444;
}
</style>
```

---

## Redis vs In-Memory

### When Each is Used

#### Redis Storage

**Used when:**
- Redis is configured and available
- Connection is healthy
- No recent connection failures

**Detection:**

```typescript
// Check if Redis is being used
import { checkRateLimit } from '#utils/rate-limiter'

const result = await checkRateLimit(event, { maxRequests: 100, windowSeconds: 900 })

// Logs will show storage backend
// Redis: "Rate limit threshold approaching"
// In-memory: "Rate limit threshold approaching" (context indicates storage)
```

**Log Examples:**

```
[Redis connected]
INFO (rate-limit): Rate limit threshold approaching
  key: "192.168.1.1"
  count: 80
  maxRequests: 100

[Redis unavailable, fallback]
INFO (rate-limit): Rate limit threshold approaching
  key: "192.168.1.1"
  count: 80
  maxRequests: 100
```

#### In-Memory Storage

**Used when:**
- Redis is not configured
- Redis connection fails
- Redis is undergoing reconnection
- Manual fallback triggered

**Detection:**

```typescript
// Check logs for "Redis failed" warning
WARN (rate-limit): Redis failed, falling back to in-memory
  key: "user-123"
  error: "Connection timeout"
```

### Automatic Reconnection

**When Redis Fails:**

1. Initial connection attempt (3 retries with exponential backoff)
2. Fallback to in-memory
3. Start periodic reconnection (every 30 seconds)
4. Log: "Starting periodic Redis reconnection attempts"

**Reconnection Attempt:**

```
INFO (rate-limit): Starting periodic Redis reconnection attempts
DEBUG (rate-limit): Redis reconnection failed, will retry later
DEBUG (rate-limit): Redis reconnection failed, will retry later
INFO (rate-limit): Redis reconnection successful
INFO (rate-limit): Connected to Redis
DEBUG (rate-limit): Stopped periodic Redis reconnection attempts
```

**Reconnection Success:**

1. `attemptReconnect()` calls `redisClient.ping()`
2. Ping succeeds → Redis is available
3. `useRedis = true`
4. Stop periodic reconnection
5. Subsequent requests use Redis

### Detecting Storage Mode

**Method 1: Check Logs**

```typescript
// Redis mode
[10:30:00] INFO (rate-limit): Connected to Redis

// In-memory mode
[10:30:00] WARN (rate-limit): Redis connection failed after 3 retries, starting periodic reconnection
```

**Method 2: Check Redis Connection**

```bash
# Check if Redis is running
redis-cli ping
# PONG = Redis available
# Connection error = Redis unavailable
```

**Method 3: Monitor Rate Limit Keys**

```bash
# Check Redis for rate limit keys
redis-cli KEYS "ratelimit:*"

# Example output:
# 1) "ratelimit:192.168.1.1"
# 2) "ratelimit:user-123"
```

**Method 4: Check Memory Store**

```typescript
// In server/utils/rate-limiter.ts
// Add temporary debugging:

setInterval(() => {
  console.log('In-memory store size:', rateLimitStore.size)
  console.log('Entries:', Array.from(rateLimitStore.keys()))
}, 60000) // Every minute

// If store size > 0, in-memory is being used
```

---

## Response Headers

### Header Values

All rate-limited responses include standard headers:

| Header | Type | Example | Description |
|--------|------|---------|-------------|
| `X-RateLimit-Limit` | `number` | `100` | Maximum requests allowed |
| `X-RateLimit-Remaining` | `number` | `45` | Requests remaining in window |
| `X-RateLimit-Reset` | `number` | `1698765432` | Unix timestamp when limit resets |

**Example Response:**

```bash
curl -I http://localhost:3000/api/example/endpoint

HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1698765432
Content-Type: application/json
```

**Error Response (429):**

```bash
curl -I http://localhost:3000/api/example/endpoint

HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1698765432
Content-Type: application/json
```

**Error Body:**

```json
{
  "statusCode": 429,
  "statusMessage": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again in 12 minutes.",
  "data": {
    "limit": 100,
    "remaining": 0,
    "resetAt": 1698765432,
    "resetDate": "2024-10-30T15:30:32.000Z"
  }
}
```

### Frontend Implementation

**TypeScript Composable:**

```typescript
// app/composables/useRateLimit.ts

export function useRateLimit() {
  const { data, error } = useFetch('/api/endpoint')

  const rateLimit = computed(() => {
    if (!data.value?.headers) return null

    return {
      limit: parseInt(data.value.headers['x-ratelimit-limit'] || '0'),
      remaining: parseInt(data.value.headers['x-ratelimit-remaining'] || '0'),
      resetAt: parseInt(data.value.headers['x-ratelimit-reset'] || '0'),
      resetDate: new Date(parseInt(data.value.headers['x-ratelimit-reset'] || '0') * 1000)
    }
  })

  const isNearLimit = computed(() => {
    if (!rateLimit.value) return false
    return rateLimit.value.remaining < rateLimit.value.limit * 0.2
  })

  const isExceeded = computed(() => {
    return rateLimit.value?.remaining === 0
  })

  return {
    rateLimit,
    isNearLimit,
    isExceeded,
    error
  }
}
```

**Vue Component:**

```vue
<script setup lang="ts">
import { useRateLimit } from '#composables/useRateLimit'

const { rateLimit, isNearLimit, isExceeded, error } = useRateLimit()

const remainingPercentage = computed(() => {
  if (!rateLimit.value) return 0
  return (rateLimit.value.remaining / rateLimit.value.limit) * 100
})
</script>

<template>
  <div v-if="rateLimit" class="rate-limit-indicator">
    <div v-if="isExceeded" class="error">
      Rate limit exceeded. Please try again later.
    </div>
    <div v-else-if="isNearLimit" class="warning">
      ⚠️ Approaching rate limit ({{ rateLimit.remaining }} remaining)
    </div>
    <div v-else class="ok">
      ✓ {{ rateLimit.remaining }} / {{ rateLimit.limit }} requests available
    </div>
    
    <div class="progress-bar">
      <div 
        class="progress-fill"
        :style="{ width: remainingPercentage + '%' }"
        :class="{
          'ok': remainingPercentage > 20,
          'warning': remainingPercentage <= 20 && remainingPercentage > 0,
          'error': remainingPercentage === 0
        }"
      />
    </div>
  </div>
</template>

<style scoped>
.rate-limit-indicator {
  padding: 1rem;
  border-radius: 0.5rem;
  background: #f9fafb;
}

.error {
  color: #dc2626;
}

.warning {
  color: #d97706;
}

.ok {
  color: #059669;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.progress-fill.ok {
  background: #059669;
}

.progress-fill.warning {
  background: #f59e0b;
}

.progress-fill.error {
  background: #dc2626;
}
</style>
```

---

## Best Practices

### 1. Use Appropriate Limits

```typescript
// ✅ Good - Reasonable limits
{
  maxRequests: 100,      // Sufficient for normal usage
  windowSeconds: 900      // 15 minute window
}

// ❌ Bad - Too restrictive
{
  maxRequests: 5,        // Too few requests
  windowSeconds: 60         // Too short window
}

// ❌ Bad - Too permissive
{
  maxRequests: 100000,   // No real limit
  windowSeconds: 86400     // Full day
}
```

### 2. Separate Limits per Endpoint

```typescript
// ✅ Good - Different limits per endpoint
// Upload endpoint
await checkRateLimit(event, {
  maxRequests: 5,
  windowSeconds: 60,
  identifier: `upload:${user.sub}`
})

// Search endpoint
await checkRateLimit(event, {
  maxRequests: 100,
  windowSeconds: 60,
  identifier: `search:${user.sub}`
})

// ❌ Bad - Same limit for all endpoints
await checkRateLimit(event, {
  maxRequests: 100,
  windowSeconds: 900
  // Same limit for uploads, search, etc.
})
```

### 3. Use Custom Identifiers

```typescript
// ✅ Good - User-based rate limiting
await checkRateLimit(event, {
  maxRequests: 1000,
  windowSeconds: 3600,
  identifier: `user:${user.sub}`  // Separate limit per user
})

// ✅ Good - API key-based
await checkRateLimit(event, {
  maxRequests: 500,
  windowSeconds: 3600,
  identifier: `apikey:${apiKey}`  // Separate limit per API key
})

// ❌ Bad - Only IP-based (can block legitimate users)
await checkRateLimit(event, {
  maxRequests: 100,
  windowSeconds: 900
  // Multiple users behind same IP share limit
})
```

### 4. Handle Rate Limit Errors

```typescript
// ✅ Good - Graceful error handling
try {
  const result = await checkRateLimit(event, { maxRequests: 100, windowSeconds: 900 })
  
  if (!result.allowed) {
    throwRateLimitError(result)
  }
  
  // Process request
} catch (error) {
  if (error instanceof Error && error.message.includes('Too Many Requests')) {
    // Rate limit error - user should retry later
    return { error: 'Please try again later' }
  }
  
  // Other errors
  throw error
}

// ❌ Bad - Not handling rate limit errors
const result = await checkRateLimit(event, { maxRequests: 100, windowSeconds: 900 })

if (!result.allowed) {
  throw new Error('Rate limit exceeded')  // Generic error
}
```

### 5. Monitor Rate Limit Usage

```typescript
// ✅ Good - Log when approaching limit
const result = await checkRateLimit(event, { maxRequests: 100, windowSeconds: 900 })

if (result.remaining === Math.ceil(config.maxRequests * 0.2)) {
  // Already logged automatically by rate limiter
  // Can add additional monitoring
  sendAlert({
    user: user.sub,
    endpoint: event.path,
    remaining: result.remaining,
    limit: result.limit
  })
}

// Monitor 429 errors
import { rateLimitLogger } from '#utils/logger'

// Check logs for:
// WARN (rate-limit): Rate limit exceeded
// This indicates endpoints that need higher limits
```

### 6. Use Fail-Open Design

```typescript
// ✅ Good - Fail open (don't block if rate limiter fails)
try {
  const result = await checkRateLimit(event, { maxRequests: 100, windowSeconds: 900 })
  if (!result.allowed) {
    throwRateLimitError(result)
  }
} catch (error) {
  if (error.message.includes('Rate limit')) {
    throw error  // Only block on actual rate limit
  }
  // Allow request if rate limiter fails
  // Production should not be blocked by rate limiter errors
}

// ❌ Bad - Fail closed (block if rate limiter fails)
try {
  const result = await checkRateLimit(event, { maxRequests: 100, windowSeconds: 900 })
  if (!result.allowed) {
    throw createError({ statusCode: 500 })
  }
} catch (error) {
  // Blocks all requests if rate limiter has issues
  throw createError({ statusCode: 500 })
}
```

### 7. Configure for Environment

```typescript
// ✅ Good - Different limits per environment
const isDev = process.env.NODE_ENV === 'development'

const limits = {
  dev: { maxRequests: 1000, windowSeconds: 60 },
  prod: { maxRequests: 100, windowSeconds: 900 }
}

await checkRateLimit(event, isDev ? limits.dev : limits.prod)

// ❌ Bad - Same limits for all environments
await checkRateLimit(event, {
  maxRequests: 100,
  windowSeconds: 900
  // Development users may hit limits during testing
})
```

---

## Troubleshooting

### Redis Not Connecting

**Problem:** Rate limiter is not using Redis.

**Solutions:**

1. **Check Redis is running:**
```bash
redis-cli ping
# Expected: PONG
# If error: Redis is not running
```

2. **Check environment variables:**
```bash
echo $REDIS_HOST
echo $REDIS_PORT
echo $REDIS_PASSWORD

# Ensure they match your Redis configuration
```

3. **Check logs for connection errors:**
```
[10:30:00] WARN (rate-limit): Redis connection failed after 3 retries, starting periodic reconnection
[10:30:00] INFO (rate-limit): Starting periodic Redis reconnection attempts
```

4. **Check network connectivity:**
```bash
# Test Redis connection
telnet localhost 6379
# or
nc -zv localhost 6379
```

5. **Verify Redis configuration:**
```typescript
// Check server/utils/rate-limiter.ts
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  // Ensure values are correct
}
```

### Rate Limit Not Working

**Problem:** Requests are not being limited.

**Solutions:**

1. **Check middleware is running:**
```typescript
// Verify server/middleware/01-api-auth.ts is loaded
export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) {
    return
  }
  
  // This should execute for all API routes
  await applyRateLimiting(event)
})
```

2. **Check if route is marked as public:**
```typescript
// Check server/api/your-endpoint.get.ts
export default defineEventHandler(async (event) => {
  // If this is set, rate limiting is skipped
  event.context.apiPublic = true
})
```

3. **Check if using custom rate limiting:**
```typescript
// If implementing custom rate limiting, verify it's correct
import { checkRateLimit, throwRateLimitError } from '#utils/rate-limiter'

const result = await checkRateLimit(event, {
  maxRequests: 100,
  windowSeconds: 900
})

if (!result.allowed) {
  throwRateLimitError(result)  // Must throw error
}
```

4. **Check rate limit headers in response:**
```bash
curl -I http://localhost:3000/api/your-endpoint

# Should see:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
```

### Rate Limit Too Strict

**Problem:** Users hitting rate limits frequently.

**Solutions:**

1. **Increase limits:**
```typescript
// From 100 req/15 min to 1000 req/hour
await checkRateLimit(event, {
  maxRequests: 1000,      // Increased
  windowSeconds: 3600      // Longer window
})
```

2. **Use user-based limiting:**
```typescript
// Instead of IP-based, use user-based
await checkRateLimit(event, {
  maxRequests: 1000,
  windowSeconds: 3600,
  identifier: `user:${user.sub}`  // Separate limit per user
})
```

3. **Separate limits per endpoint:**
```typescript
// Different limits for different endpoints
const limits = {
  search: { maxRequests: 100, windowSeconds: 60 },
  upload: { maxRequests: 5, windowSeconds: 60 },
  api: { maxRequests: 1000, windowSeconds: 3600 }
}

await checkRateLimit(event, limits[endpointType])
```

### In-Memory Storage Used Unexpectedly

**Problem:** Rate limiter using in-memory instead of Redis.

**Solutions:**

1. **Check Redis connection:**
```bash
redis-cli ping
# If not PONG, Redis is unavailable
```

2. **Check logs for Redis errors:**
```
[10:30:00] WARN (rate-limit): Redis connection failed after 3 retries
[10:30:00] INFO (rate-limit): Starting periodic Redis reconnection attempts
```

3. **Check reconnection attempts:**
```bash
# Check if Redis becomes available later
# Look for: "Redis reconnection successful"
```

4. **Verify environment variables:**
```bash
# Check .env file
cat .env | grep REDIS

# Should have:
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=optional
```

### Debugging Rate Limits

**Solution 1: Add Logging**

```typescript
import { rateLimitLogger } from '#utils/logger'

export default defineEventHandler(async (event) => {
  rateLimitLogger.debug({
    path: event.path,
    method: event.method
  }, 'Rate limit check started')

  const result = await checkRateLimit(event, {
    maxRequests: 100,
    windowSeconds: 900
  })

  rateLimitLogger.debug({
    allowed: result.allowed,
    remaining: result.remaining,
    resetAt: result.resetAt
  }, 'Rate limit check completed')

  if (!result.allowed) {
    throwRateLimitError(result)
  }

  return { message: 'Success' }
})
```

**Solution 2: Monitor Redis Keys**

```bash
# Watch rate limit keys in real-time
redis-cli MONITOR

# Look for:
# "INCR ratelimit:192.168.1.1"
# "PEXPIRE ratelimit:192.168.1.1"
# "PTTL ratelimit:192.168.1.1"
```

**Solution 3: Check Rate Limit Store**

```typescript
// Add temporary debugging to server/utils/rate-limiter.ts
setInterval(() => {
  rateLimitLogger.debug({
    storeSize: rateLimitStore.size,
    keys: Array.from(rateLimitStore.keys())
  }, 'In-memory rate limit store')
}, 60000)
```

### Rate Limit Headers Missing

**Problem:** Response doesn't include X-RateLimit-* headers.

**Solutions:**

1. **Check middleware execution:**
```typescript
// Verify server/middleware/01-api-auth.ts is adding headers
async function applyRateLimiting(event: H3Event): Promise<void> {
  const result = await checkRateLimit(event, {
    maxRequests: 100,
    windowSeconds: 900
  })

  // Headers are added here
  event.node.res.setHeader('X-RateLimit-Limit', result.limit.toString())
  event.node.res.setHeader('X-RateLimit-Remaining', result.remaining.toString())
  event.node.res.setHeader('X-RateLimit-Reset', result.resetAt.toString())

  if (!result.allowed) {
    throwRateLimitError(result)
  }
}
```

2. **Check if headers are overridden:**
```typescript
// Ensure endpoint is not clearing headers
export default defineEventHandler(async (event) => {
  // Don't do this:
  event.node.res.setHeader('X-RateLimit-Limit', undefined)
  
  // Or this:
  event.node.res.removeHeader('X-RateLimit-Limit')
})
```

3. **Check response with curl:**
```bash
curl -I http://localhost:3000/api/endpoint

# Verify headers are present
```

---

## Summary

The rate limiter provides:

✅ **Redis-First Architecture** - Distributed rate limiting with automatic fallback  
✅ **Automatic Reconnection** - Reconnects to Redis every 30 seconds when unavailable  
✅ **Standard Headers** - X-RateLimit-* headers in all responses  
✅ **Flexible Configuration** - Customize limits per endpoint, user, or role  
✅ **Fail-Open Design** - Never blocks production due to rate limiter errors  
✅ **Type Safe** - Full TypeScript support with strict types  
✅ **Integrated Logging** - All events logged with rateLimitLogger  
✅ **Production Ready** - Robust error handling and reconnection logic  

For more information, see:
- Rate limiter implementation: `server/utils/rate-limiter.ts`
- Middleware integration: `server/middleware/01-api-auth.ts`
- Redis documentation: https://redis.io/
- ioredis documentation: https://github.com/luin/ioredis
