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
   */
  function useQuery<T = unknown>(
    queryString: string,
    variables?: Record<string, unknown>,
    options?: RequestOptions
  ): UseQueryResult<T> {
    const data = ref<T | null>(null) as Ref<T | null>
    const loading = ref(false)
    const error = ref<Error | null>(null)

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

    // Execute immediately
    execute()

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
   */
  function useSubscription<T = unknown>(
    subscriptionString: string,
    variables?: Record<string, unknown>
  ): UseSubscriptionResult<T> {
    const data = ref<T | null>(null) as Ref<T | null>
    const error = ref<unknown | null>(null)
    const isActive = ref(false)

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

    // Start automatically
    start()

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
