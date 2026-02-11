# JWT Endpoint Documentation

## Overview

The `/api/auth/jwt` endpoint retrieves the ID token from Logto that can be used to authenticate requests with external services like Hasura GraphQL Engine or other protected APIs.

## Purpose

This endpoint provides server-side access to the Logto JWT token, which contains user claims and authentication information. It's particularly useful for:

- **Hasura GraphQL Integration**: Authenticate GraphQL queries with Hasura using JWT claims
- **External API Calls**: Call third-party services that require JWT authentication
- **B2B Authentication**: Enable machine-to-machine authentication between services

## How It Works

The endpoint uses the Logto client initialized in `server/middleware/01-api-auth.ts` to:

1. Retrieve the ID token directly using `client.getIdToken()`
2. Get user information via `client.getContext({ fetchUserInfo: true })`
3. Decode the JWT to extract expiration time
4. Return the complete JWT token string with user info and expiration

## Endpoint Details

**URL:** `GET /api/auth/jwt`

**Authentication Required:** Yes (requires active Logto session)

**Response:**
```typescript
{
  token: string        // Complete JWT token string
  user: unknown       // User information from Logto
  expiresAt: number   // Unix timestamp when token expires
}
```

## Usage Examples

### 1. Frontend Integration (Vue/Nuxt)

```typescript
// In a Vue component
const jwtToken = ref<string | null>(null)

// Fetch the JWT token
const { data, error } = await useFetch('/api/auth/jwt')

if (data?.token) {
  jwtToken.value = data.token
  console.log('Token expires at:', new Date(data.expiresAt! * 1000))
}
```

**Full Example with Authentication:**
```typescript
<script setup lang="ts">
import { useAuthClient } from '~/lib/auth-client'

const jwtToken = ref<string | null>(null)
const jwtPending = ref(false)
const authClient = useAuthClient()

onMounted(async () => {
  // Check if user is authenticated
  if (session.value?.user && !jwtToken.value) {
    try {
      jwtPending.value = true
      const { data, error } = await authClient.token()
      
      if (data?.token) {
        jwtToken.value = data.token
      }
      
      if (error) {
        console.error('[JWT] Error fetching token:', error)
      }
    } catch (error) {
      console.error('[JWT] Failed to fetch token:', error)
    } finally {
      jwtPending.value = false
    }
  }
})
</script>
```

### 2. Hasura GraphQL Integration

Use the JWT token to authenticate with Hasura GraphQL Engine:

```typescript
const response = await fetch('https://your-hasura.com/v1/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    query: `
      query GetUsers {
        users {
          id
          name
          email
        }
      }
    `
  })
})

const data = await response.json()
```

**Configuring Hasura with Logto:**

To use this token with Hasura, configure Logto's JWT claims to include Hasura-specific claims:

1. Go to Logto Admin Console
2. Navigate to **Application** → **API Resources**
3. Configure the JWT claims to include:
   ```json
   {
     "https://hasura.io/jwt/claims": {
       "x-hasura-default-role": "user",
       "x-hasura-allowed-roles": ["user", "admin"],
       "x-hasura-user-id": "{{sub}}"
     }
   }
   ```

### 3. External API Integration

Use the token to authenticate with any OAuth2/JWT-protected API:

```typescript
// Example: Call an external microservice
const response = await fetch('https://api.example.com/protected', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

const data = await response.json()
```

## Token Structure

The returned token is a standard JWT with three parts separated by dots:

```
header.payload.signature
```

**Decoded Payload Example:**
```json
{
  "sub": "user123",
  "aud": "your-app-id",
  "exp": 1234567890,
  "iat": 1234567800,
  "iss": "https://your-logto-endpoint.com",
  "email": "user@example.com",
  "username": "john_doe"
}
```

## Error Handling

The endpoint returns appropriate HTTP status codes for error scenarios:

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "statusMessage": "User not authenticated"
}
```
**Cause:** No active Logto session or user is not logged in

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "statusMessage": "Failed to get JWT token"
}
```
**Cause:** Logto client error, token retrieval failure, or invalid token format

### Client-Side Error Handling

```typescript
const { data, error } = await useFetch('/api/auth/jwt', {
  credentials: 'include' // Required for cookie handling
})

if (error.value) {
  if (error.value.statusCode === 401) {
    // Redirect to login or show auth modal
    navigateTo('/sign-in')
  } else {
    // Show generic error message
    console.error('Failed to fetch JWT:', error.value)
  }
}
```

## Security Considerations

1. **HTTPS Only**: Always use HTTPS when transmitting JWT tokens
2. **Token Storage**: This endpoint does not store tokens client-side; tokens are retrieved server-side
3. **Token Expiration**: Always check `expiresAt` and refresh tokens before expiration
4. **Session Cookies**: The endpoint relies on Logto session cookies (`credentials: 'include')

## Token Expiration Management

Monitor token expiration and refresh accordingly:

```typescript
const isTokenExpired = (expiresAt: number): boolean => {
  const now = Math.floor(Date.now() / 1000)
  // Refresh 5 minutes before expiration
  return expiresAt - now < 300
}

if (isTokenExpired(jwtExpiresAt!)) {
  // Fetch fresh token
  const { data } = await useFetch('/api/auth/jwt')
  jwtToken.value = data.value?.token
}
```

## Implementation Details

### Server-Side Code

The endpoint implementation (`server/api/auth/jwt.get.ts`):

```typescript
export default defineEventHandler(async (event) => {
  const client = event.context.logtoClient as unknown as {
    getIdToken: () => Promise<string | null>
    getContext: (params?: { fetchUserInfo?: boolean }) => Promise<{
      isAuthenticated: boolean
      userInfo?: unknown
    }>
  }

  // Get ID token directly
  const token = await client.getIdToken()
  
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'User not authenticated' })
  }

  // Get user info
  const context = await client.getContext({ fetchUserInfo: true })

  // Decode JWT for expiration
  const parts = token.split('.')
  const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString('utf-8'))

  return {
    token,
    user: context.userInfo,
    expiresAt: payload.exp
  }
})
```

### Middleware Integration

The Logto client is initialized by `server/middleware/01-api-auth.ts`:

```typescript
import { logtoEventHandler } from '#logto'

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return
  
  const config = useRuntimeConfig(event)
  await logtoEventHandler(event, config)
  
  // Now event.context.logtoClient is available
})
```

## Troubleshooting

### Issue: "User not authenticated" (401)
**Solution:** Ensure user is logged in and has an active Logto session. Check browser cookies.

### Issue: "Invalid token format"
**Solution:** The token from Logto is not in standard JWT format. Check Logto configuration and verify JWT claims settings.

### Issue: Token undefined/null
**Solution:** Verify that the Logto middleware (`01-api-auth.ts`) is running and initializing the client correctly.

## Related Documentation

- [Logging Guide](./logging-guide.md) - For debugging endpoint issues
- [API Middleware Examples](./api-middleware-examples.md) - For middleware patterns
- [Logto Documentation](https://docs.logto.io/) - Official Logto documentation

## Additional Resources

- [Hasura JWT Authentication](https://hasura.io/docs/latest/auth/authentication/jwt/)
- [Logto ID Token Configuration](https://docs.logto.io/recipes/configure-id-token/)
- [OAuth 2.0 Bearer Token Usage](https://oauth.net/2/bearer-tokens/)
