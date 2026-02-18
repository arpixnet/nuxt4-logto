/**
 * GraphQL Client Composable
 *
 * Main composable for GraphQL operations in Nuxt.
 * Provides query, mutate, subscribe, and reactive helpers.
 *
 * SECURITY: Tokens are stored only in memory, never in cookies or localStorage.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { query, mutate, useQuery, useSubscription } = useGraphQLClient()
 *
 * // Simple query
 * const users = await query<{ users: User[] }>(`
 *   query GetUsers {
 *     users {
 *       id
 *       name
 *       email
 *     }
 *   }
 * `)
 *
 * // Reactive query
 * const { data, loading, error, refetch } = useQuery<{ posts: Post[] }>(`
 *   query GetPosts {
 *     posts(order_by: { created_at: desc }) {
 *       id
 *       title
 *     }
 *   }
 * `)
 *
 * // Mutation
 * await mutate(`
 *   mutation CreateUser($name: String!, $email: String!) {
 *     insert_users_one(object: { name: $name, email: $email }) {
 *       id
 *     }
 *   }
 * `, { name: 'John', email: 'john@example.com' })
 *
 * // Subscription
 * onMounted(() => {
 *   const unsubscribe = useSubscription<{ users: User[] }>(`
 *     subscription OnUserChange {
 *       users {
 *         id
 *         name
 *       }
 *     }
 *   `)
 * })
 * </script>
 * ```
 */

import { ref, onUnmounted, watch } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'
import { GraphQLClient } from '../lib/graphql/GraphQLClient'
import { useTokenManager } from '../lib/graphql/TokenManager'
import type {
  RequestOptions,
  SubscriptionHandlers,
  UseQueryResult,
  UseSubscriptionResult
} from '../lib/graphql/types'

/** Extended options for useQuery with auth wait support */
interface UseQueryOptions extends RequestOptions {
  /** Wait for authentication before executing (default: true) */
  waitForAuth?: boolean
}

/** Extended options for useSubscription with auth wait support */
interface UseSubscriptionOptions {
  /** Wait for authentication before starting (default: true) */
  waitForAuth?: boolean
}

/** Singleton client instance */
let clientInstance: GraphQLClient | null = null

/**
 * Get or create the GraphQL client instance
 */
function getClient(): GraphQLClient {
  if (!clientInstance) {
    const config = useRuntimeConfig()
    const graphqlConfig = config.public.graphql

    if (!graphqlConfig?.httpUrl) {
      throw new Error(
        'GraphQL httpUrl not configured. Add graphql.httpUrl to your nuxt.config.ts'
      )
    }

    clientInstance = new GraphQLClient(graphqlConfig)
  }

  return clientInstance
}

/**
 * Main composable for GraphQL operations
 */
export function useGraphQLClient() {
  const tokenManager = useTokenManager()
  const { isAuthenticated } = useAuthSession()

  /**
   * Execute a GraphQL query
   */
  async function query<T = unknown>(
    queryString: string,
    variables?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<T> {
    const client = getClient()
    return client.query<T>(queryString, variables, options)
  }

  /**
   * Execute a GraphQL mutation
   */
  async function mutate<T = unknown>(
    mutationString: string,
    variables?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<T> {
    const client = getClient()
    return client.mutate<T>(mutationString, variables, options)
  }

  /**
   * Subscribe to a GraphQL subscription
   */
  function subscribe<T = unknown>(
    subscriptionString: string,
    handlers: SubscriptionHandlers<T>,
    variables?: Record<string, unknown>
  ): () => void {
    const client = getClient()
    return client.subscribe<T>(subscriptionString, handlers, variables)
  }

  /**
   * Reactive query helper
   *
   * Automatically fetches data and provides reactive state.
   * By default, waits for authentication before executing to avoid race conditions.
   *
   * @param queryString - GraphQL query string
   * @param variables - Query variables
   * @param options - Request options including waitForAuth (default: true)
   */
  function useQuery<T = unknown>(
    queryString: string,
    variables?: Record<string, unknown>,
    options?: UseQueryOptions
  ): UseQueryResult<T> {
    const data = ref<T | null>(null) as Ref<T | null>
    // Start loading=true when waiting for auth to avoid flicker
    const loading = ref(options?.waitForAuth !== false)
    const error = ref<Error | null>(null)
    const hasExecuted = ref(false)

    // Default waitForAuth to true to prevent race conditions on page refresh
    const waitForAuth = options?.waitForAuth !== false

    const execute = async () => {
      loading.value = true
      error.value = null

      try {
        data.value = await query<T>(queryString, variables, options)
      } catch (e) {
        error.value = e instanceof Error ? e : new Error(String(e))
      } finally {
        loading.value = false
      }
    }

    // Only run queries on client-side to avoid SSR issues
    if (import.meta.server) {
      // During SSR, don't execute - just return empty state
      loading.value = false
    } else if (waitForAuth) {
      // On client, wait for authentication before executing
      watch(isAuthenticated, (auth) => {
        if (auth && !hasExecuted.value) {
          hasExecuted.value = true
          execute()
        }
      }, { immediate: true })
    } else {
      // Execute immediately (old behavior, may cause race conditions)
      execute()
    }

    return {
      data,
      loading,
      error,
      refetch: execute
    }
  }

  /**
   * Reactive subscription helper
   *
   * Automatically manages subscription lifecycle.
   * By default, waits for authentication before starting to avoid race conditions.
   *
   * @param subscriptionString - GraphQL subscription string
   * @param variables - Subscription variables
   * @param options - Options including waitForAuth (default: true)
   */
  function useSubscription<T = unknown>(
    subscriptionString: string,
    variables?: Record<string, unknown>,
    options?: UseSubscriptionOptions
  ): UseSubscriptionResult<T> {
    const data = ref<T | null>(null) as Ref<T | null>
    const error = ref<unknown | null>(null)
    const isActive = ref(false)
    const hasStarted = ref(false)

    // Default waitForAuth to true to prevent race conditions on page refresh
    const waitForAuth = options?.waitForAuth !== false

    let unsubscribe: (() => void) | null = null

    const start = () => {
      if (isActive.value) return

      isActive.value = true
      unsubscribe = subscribe<T>(
        subscriptionString,
        {
          next: (newData) => {
            data.value = newData
          },
          error: (err) => {
            error.value = err
            isActive.value = false
          },
          complete: () => {
            isActive.value = false
          }
        },
        variables
      )
    }

    const stop = () => {
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
      isActive.value = false
    }

    if (waitForAuth) {
      // Wait for authentication before starting
      watch(isAuthenticated, (auth) => {
        if (auth && !hasStarted.value) {
          hasStarted.value = true
          start()
        }
      }, { immediate: true })
    } else {
      // Start immediately (old behavior, may cause race conditions)
      start()
    }

    // Clean up on unmount
    onUnmounted(stop)

    return {
      data,
      error,
      isActive,
      start,
      stop
    }
  }

  /**
   * Clear the authentication token
   *
   * Call this on logout to ensure token is cleared from memory
   */
  function clearToken(): void {
    tokenManager.clearToken()
  }

  /**
   * Get the underlying client for advanced usage
   */
  function getClientInstance(): GraphQLClient {
    return getClient()
  }

  // Clear token when user logs out
  watch(isAuthenticated, (authenticated) => {
    if (!authenticated) {
      clearToken()
    }
  })

  return {
    query,
    mutate,
    subscribe,
    useQuery,
    useSubscription,
    clearToken,
    getClient: getClientInstance
  }
}
