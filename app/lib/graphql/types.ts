/**
 * GraphQL Client Types
 *
 * Type definitions for the secure GraphQL client implementation.
 */

/**
 * GraphQL client configuration
 */
export interface GraphQLConfig {
  /** HTTP endpoint URL (required) */
  httpUrl: string
  /** WebSocket endpoint URL for subscriptions (optional) */
  wsUrl?: string
  /** Default headers for all requests */
  defaultHeaders?: Record<string, string>
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Options for individual GraphQL requests
 */
export interface RequestOptions {
  /** Custom headers for this request */
  headers?: Record<string, string>
  /** Skip authentication (for public queries) */
  skipAuth?: boolean
}

/**
 * Handlers for GraphQL subscriptions
 */
export interface SubscriptionHandlers<T = unknown> {
  /** Called when new data is received */
  next: (data: T) => void
  /** Called when an error occurs */
  error?: (error: unknown) => void
  /** Called when subscription completes */
  complete?: () => void
}

/**
 * Response from the JWT endpoint
 */
export interface JwtTokenResponse {
  /** The JWT token */
  token: string
  /** User information */
  user?: {
    sub?: string
    email?: string
    name?: string
    picture?: string
  }
  /** Token expiration timestamp (Unix seconds) */
  expiresAt?: number
}

/**
 * Decoded JWT token structure
 */
export interface DecodedToken {
  exp?: number
  iat?: number
  sub?: string
  [key: string]: unknown
}

/**
 * Reactive query result
 */
export interface UseQueryResult<T> {
  /** The query data (reactive) */
  data: Ref<T | null>
  /** Loading state */
  loading: Ref<boolean>
  /** Error state */
  error: Ref<Error | null>
  /** Function to refetch the data */
  refetch: () => Promise<void>
}

/**
 * Reactive subscription result
 */
export interface UseSubscriptionResult<T> {
  /** The subscription data (reactive) */
  data: Ref<T | null>
  /** Error state */
  error: Ref<unknown | null>
  /** Whether the subscription is active */
  isActive: Ref<boolean>
  /** Start the subscription */
  start: () => void
  /** Stop the subscription */
  stop: () => void
}
