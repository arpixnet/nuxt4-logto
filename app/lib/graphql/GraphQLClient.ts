/**
 * GraphQL Client
 *
 * A secure GraphQL client for Hasura integration with:
 * - Automatic JWT authentication via Logto
 * - WebSocket support for subscriptions
 * - Token stored only in memory (secure)
 *
 * @example
 * ```ts
 * const client = new GraphQLClient({
 *   httpUrl: 'http://localhost:8080/v1/graphql',
 *   wsUrl: 'ws://localhost:8080/v1/graphql'
 * })
 *
 * // Query
 * const data = await client.query(`{ users { id name } }`)
 *
 * // Mutation
 * await client.mutate(`mutation CreateUser($name: String!) {
 *   insert_users_one(object: { name: $name }) { id }
 * }`, { name: 'John' })
 *
 * // Subscription
 * const unsub = client.subscribe(`subscription { users { id name } }`, {
 *   next: (data) => console.log(data)
 * })
 * ```
 */

import { GraphQLClient as GQLRequestClient } from 'graphql-request'
import { createClient, type Client as WSClient } from 'graphql-ws'
import type { GraphQLConfig, RequestOptions, SubscriptionHandlers } from './types'
import { useTokenManager } from './TokenManager'

/** Logger for GraphQL client */
const getLogger = () => useClientLogger()

export class GraphQLClient {
  /** HTTP client for queries and mutations */
  private httpClient: GQLRequestClient

  /** WebSocket client for subscriptions */
  private wsClient: WSClient | null = null

  /** Token manager for authentication */
  private tokenManager: ReturnType<typeof useTokenManager>

  /** Client configuration */
  private config: GraphQLConfig

  /** Whether we're in a browser context */
  private isClient = import.meta.client

  constructor(config: GraphQLConfig) {
    this.config = config
    this.httpClient = new GQLRequestClient(config.httpUrl)
    this.tokenManager = useTokenManager()

    // Initialize WebSocket client only on browser
    if (config.wsUrl && this.isClient) {
      this.initializeWSClient()
    }
  }

  /**
   * Log message if debug mode is enabled
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[GraphQL] ${message}`, ...args)
    }
  }

  /**
   * Initialize WebSocket client for subscriptions
   */
  private initializeWSClient(): void {
    if (!this.config.wsUrl) return

    this.log('Initializing WebSocket client:', this.config.wsUrl)

    this.wsClient = createClient({
      url: this.config.wsUrl,
      connectionParams: async () => {
        const token = await this.tokenManager.getValidToken()
        const headers: Record<string, string> = {}

        if (token) {
          headers.Authorization = `Bearer ${token}`
        }

        // Add default headers
        if (this.config.defaultHeaders) {
          Object.assign(headers, this.config.defaultHeaders)
        }

        this.log('WebSocket connection params:', { headers: Object.keys(headers) })
        return { headers }
      },
      on: {
        connected: () => this.log('WebSocket connected'),
        error: error => getLogger().error('graphql', 'WebSocket connection error', error),
        closed: () => this.log('WebSocket connection closed')
      },
      shouldRetry: () => true,
      retryAttempts: 5,
      retryWait: async (retries) => {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = Math.min(1000 * Math.pow(2, retries), 16000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    })
  }

  /**
   * Build headers for a request
   */
  private async buildHeaders(options?: RequestOptions): Promise<Record<string, string>> {
    const headers: Record<string, string> = {}

    // Add default headers (lowercase for consistency)
    if (this.config.defaultHeaders) {
      for (const [key, value] of Object.entries(this.config.defaultHeaders)) {
        headers[key.toLowerCase()] = value
      }
    }

    // Add auth token unless skipAuth is set
    if (!options?.skipAuth) {
      const token = await this.tokenManager.getValidToken()
      if (token) {
        headers.authorization = `Bearer ${token}`
      }
    }

    // Add request-specific headers
    if (options?.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        headers[key.toLowerCase()] = value
      }
    }

    return headers
  }

  /**
   * Execute a GraphQL query
   *
   * @param query - GraphQL query string
   * @param variables - Query variables
   * @param options - Request options
   * @returns Query result
   */
  async query<T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<T> {
    try {
      const headers = await this.buildHeaders(options)

      this.log('Executing query:', {
        query: query.slice(0, 100) + '...',
        hasVariables: !!variables,
        headers: Object.keys(headers)
      })

      const result = await this.httpClient.request<T>(query, variables, headers)
      this.log('Query result received')

      return result
    } catch (error) {
      getLogger().error('graphql', 'Query execution failed', error)
      throw error
    }
  }

  /**
   * Execute a GraphQL mutation
   *
   * @param mutation - GraphQL mutation string
   * @param variables - Mutation variables
   * @param options - Request options
   * @returns Mutation result
   */
  async mutate<T = unknown>(
    mutation: string,
    variables?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<T> {
    return this.query<T>(mutation, variables, options)
  }

  /**
   * Subscribe to a GraphQL subscription
   *
   * @param subscription - GraphQL subscription string
   * @param handlers - Subscription handlers
   * @param variables - Subscription variables
   * @returns Unsubscribe function
   */
  subscribe<T = unknown>(
    subscription: string,
    handlers: SubscriptionHandlers<T>,
    variables?: Record<string, unknown>
  ): () => void {
    if (!this.wsClient) {
      getLogger().warn('graphql', 'WebSocket client not initialized. Configure wsUrl for subscriptions.')
      return () => {}
    }

    this.log('Starting subscription')

    const unsubscribe = this.wsClient.subscribe(
      {
        query: subscription,
        variables
      },
      {
        next: (result) => {
          this.log('Subscription data received')
          if (result.data) {
            handlers.next(result.data as T)
          }
        },
        error: (error) => {
          getLogger().error('graphql', 'Subscription error', error)
          handlers.error?.(error)
        },
        complete: () => {
          this.log('Subscription completed')
          handlers.complete?.()
        }
      }
    )

    return unsubscribe
  }

  /**
   * Close WebSocket connection
   */
  dispose(): void {
    if (this.wsClient) {
      this.wsClient.dispose()
      this.wsClient = null
    }
  }

  /**
   * Get the underlying HTTP client for advanced usage
   */
  getHTTPClient(): GQLRequestClient {
    return this.httpClient
  }

  /**
   * Get the underlying WebSocket client for advanced usage
   */
  getWSClient(): WSClient | null {
    return this.wsClient
  }

  /**
   * Get the token manager for manual token operations
   */
  getTokenManager(): ReturnType<typeof useTokenManager> {
    return this.tokenManager
  }
}
