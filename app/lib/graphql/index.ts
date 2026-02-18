/**
 * GraphQL Client Module
 *
 * Secure GraphQL client for Hasura integration with Logto authentication.
 *
 * Security features:
 * - Tokens stored ONLY in memory (never cookies/localStorage)
 * - Automatic token refresh before expiration
 * - Token cleared on logout
 *
 * @example
 * ```ts
 * // In a component
 * const { query, useQuery } = useGraphQLClient()
 *
 * // Simple query
 * const data = await query(`{ users { id name } }`)
 *
 * // Reactive query
 * const { data, loading, error } = useQuery(`{ posts { id title } }`)
 * ```
 */

export { GraphQLClient } from './GraphQLClient'
export { TokenManager, useTokenManager } from './TokenManager'
export type {
  GraphQLConfig,
  RequestOptions,
  SubscriptionHandlers,
  JwtTokenResponse,
  DecodedToken,
  UseQueryResult,
  UseSubscriptionResult
} from './types'
