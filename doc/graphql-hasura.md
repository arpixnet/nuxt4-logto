# GraphQL and Hasura

This document describes the architecture and implementation of GraphQL with Hasura in the project.

## General Architecture

### Configuration

The GraphQL configuration is located in `nuxt.config.ts`:

```typescript
graphql: {
  httpUrl: 'http://localhost:8080/v1/graphql',
  wsUrl: 'ws://localhost:8080/v1/graphql',
  debug: true // Only in development
}
```

### Dependencies

```json
{
  "graphql": "^16.12.0",
  "graphql-request": "^7.4.0",
  "graphql-ws": "^6.0.7",
  "jwt-decode": "^4.0.0"
}
```

## GraphQL Module Structure

```
app/lib/graphql/
├── index.ts          # Main exports
├── GraphQLClient.ts  # Main client with authentication
├── TokenManager.ts   # Secure JWT token manager
└── types.ts          # TypeScript definitions
```

## Authentication Flow

1. **Logto**: Manages user authentication
2. **JWT Endpoint**: `/api/auth/jwt` generates token with Hasura claims
3. **TokenManager**: Stores token only in memory (secure against XSS)
4. **GraphQLClient**: Automatically adds `Authorization: Bearer <token>` header

### JWT Claims for Hasura

The JWT includes specific claims for Hasura:

```json
{
  "https://hasura.io/jwt/claims": {
    "x-hasura-user-id": "{{user.sub}}",
    "x-hasura-default-role": "user",
    "x-hasura-allowed-roles": ["user", "admin"]
  }
}
```

## Main Components

### GraphQLClient

The GraphQL client (`app/lib/graphql/GraphQLClient.ts`) provides:

- HTTP queries with `graphql-request`
- WebSocket subscriptions with `graphql-ws`
- Automatic JWT authentication
- Retry with exponential backoff for WebSocket

#### Methods

| Method | Description |
|--------|-------------|
| `query()` | Execute GraphQL queries |
| `mutate()` | Execute GraphQL mutations |
| `subscribe()` | Real-time subscriptions |

### TokenManager

The token manager (`app/lib/graphql/TokenManager.ts`) implements:

- **Security**: Tokens stored only in memory (never in cookies/localStorage)
- **Automatic refresh**: Gets new token before expiration (5 minute buffer)
- **Concurrency**: Avoids simultaneous refresh requests

### useGraphQLClient

The main composable (`app/composables/useGraphQLClient.ts`) provides:

```typescript
const { useQuery, useSubscription, mutate, client } = useGraphQLClient()
```

| Function | Description |
|----------|-------------|
| `useQuery()` | Reactive queries with loading/error states |
| `useSubscription()` | Reactive real-time subscriptions |
| `mutate()` | Manual mutations |
| `client` | Direct access to GraphQL client |

## Usage Examples

### Reactive Query

```vue
<script setup lang="ts">
interface Post {
  id: string
  title: string
  content: string
  author_id: string
  created_at: string
}

const { useQuery } = useGraphQLClient()

const { data, loading, error, refetch } = useQuery<{ posts: Post[] }>(`
  query GetPosts {
    posts(order_by: { created_at: desc }, limit: 10) {
      id
      title
      content
      author_id
      created_at
    }
  }
`)
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else>
    <article v-for="post in data?.posts" :key="post.id">
      <h2>{{ post.title }}</h2>
      <p>{{ post.content }}</p>
    </article>
  </div>
</template>
```

### Mutation

```typescript
const { mutate } = useGraphQLClient()

async function createPost(title: string, content: string) {
  const result = await mutate(`
    mutation CreatePost($title: String!, $content: String!) {
      insert_posts_one(object: {
        title: $title,
        content: $content
      }) {
        id
        title
      }
    }
  `, { title, content })

  return result
}
```

### Real-time Subscription

```vue
<script setup lang="ts">
const { useSubscription } = useGraphQLClient()

const { data, connected } = useSubscription<{ posts: Post[] }>(`
  subscription OnPostsChange {
    posts(order_by: { created_at: desc }, limit: 10) {
      id
      title
      author_id
      created_at
    }
  }
`)
</script>

<template>
  <div :class="{ 'opacity-50': !connected }">
    <!-- Data updates automatically -->
  </div>
</template>
```

## Security Features

| Feature | Description |
|---------|-------------|
| Tokens in memory | Prevents XSS attacks |
| Automatic refresh | Tokens renewed before expiration |
| Cleanup on logout | Tokens deleted on sign out |
| HttpOnly cookies | Logto uses secure cookies for session |
| Custom claims | JWT includes Hasura claims |

## Design Patterns

### Separation of Concerns

- **Logto**: Manages identity and authentication
- **Hasura**: Manages data access and authorization
- **Nuxt**: User interface and GraphQL calls

### Reactive Queries

- Auto-refetch on changes
- Integrated loading/error states
- Integration with Nuxt's `useFetch` pattern

### Real-time Subscriptions

- WebSocket with auto-reconnection
- Automatic cleanup on component unmount
- Active/inactive connection states

## Nuxt 4 Integration

### Auto-imports

Composables are globally available:

```typescript
// Available in any component
const { useQuery } = useGraphQLClient()
```

### SSR/CSR Friendly

- Queries are not executed in SSR (avoids authentication issues)
- Use `ClientOnly` for components that depend on client:

```vue
<ClientOnly>
  <GraphQLExample />
</ClientOnly>
```

## Hasura Configuration

### Environment Variables

```bash
HASURA_GRAPHQL_ADMIN_SECRET=your_admin_secret
HASURA_GRAPHQL_JWT_SECRET={"type":"RS256","jwk_url":"..."}
```

### Docker Compose

The `docker/docker-compose.yml` file includes Hasura on port 8080.

For more details on Docker configuration, see the `docker/docker-compose.yml` file.
