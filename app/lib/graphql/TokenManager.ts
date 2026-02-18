/**
 * Secure Token Manager
 *
 * Manages JWT tokens for Hasura authentication.
 *
 * SECURITY: Tokens are stored ONLY in memory - never in cookies or localStorage.
 * This prevents token theft via XSS attacks.
 *
 * Trade-offs:
 * - Token is lost on page refresh (acceptable - user re-authenticates via Logto session)
 * - Slightly more API calls (token fetched on each page load)
 * - Much better security posture
 */

import { jwtDecode } from 'jwt-decode'
import type { JwtTokenResponse, DecodedToken } from './types'

/** Logger for TokenManager */
const getLogger = () => useClientLogger()

/** Token endpoint path */
const TOKEN_ENDPOINT = '/api/auth/jwt'

/** Buffer time before expiration to refresh (seconds) */
const REFRESH_BUFFER_SECONDS = 300 // 5 minutes

export class TokenManager {
  /** Cached token in memory (NOT in cookie or localStorage) */
  private cachedToken: string | null = null

  /** Token expiration timestamp (Unix seconds) */
  private expiresAt: number | null = null

  /** Prevents concurrent refresh requests */
  private refreshPromise: Promise<string | null> | null = null

  /** Whether we're in a browser context */
  private isClient = import.meta.client

  /**
   * Get a valid token, refreshing if necessary
   *
   * @returns The valid token, or null if unauthenticated
   */
  async getValidToken(): Promise<string | null> {
    // Return cached token if still valid
    if (this.cachedToken && this.isTokenValid()) {
      return this.cachedToken
    }

    // Prevent concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    // Fetch new token
    this.refreshPromise = this.fetchToken()
    try {
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * Check if the current token is valid (not expired)
   */
  private isTokenValid(): boolean {
    if (!this.cachedToken || !this.expiresAt) {
      return false
    }

    const now = Math.floor(Date.now() / 1000)
    return this.expiresAt > now + REFRESH_BUFFER_SECONDS
  }

  /**
   * Fetch token from the server-side endpoint
   *
   * The endpoint uses Logto's session (HttpOnly cookie) to generate
   * a fresh JWT with Hasura claims.
   */
  private async fetchToken(): Promise<string | null> {
    if (!this.isClient) {
      return null
    }

    try {
      const response = await $fetch<JwtTokenResponse>(TOKEN_ENDPOINT, {
        method: 'GET',
        credentials: 'include' // Include Logto's HttpOnly session cookie
      })

      if (response?.token) {
        this.setToken(response.token, response.expiresAt)
        return this.cachedToken
      }

      return null
    } catch (error) {
      getLogger().error('graphql', 'Failed to fetch token', error)
      this.clearToken()
      return null
    }
  }

  /**
   * Store token in memory
   */
  private setToken(token: string, expiresAt?: number): void {
    this.cachedToken = token

    // Use provided expiration or decode from token
    if (expiresAt) {
      this.expiresAt = expiresAt
    } else {
      try {
        const decoded = jwtDecode<DecodedToken>(token)
        this.expiresAt = decoded.exp || null
      } catch {
        getLogger().warn('graphql', 'Failed to decode token expiration, using default')
        this.expiresAt = null
      }
    }
  }

  /**
   * Clear token from memory
   *
   * Call this on logout to ensure token is immediately invalidated
   */
  clearToken(): void {
    this.cachedToken = null
    this.expiresAt = null
    this.refreshPromise = null
  }

  /**
   * Check if a token is currently cached
   */
  hasToken(): boolean {
    return this.cachedToken !== null
  }

  /**
   * Get token expiration time
   */
  getExpiresAt(): number | null {
    return this.expiresAt
  }
}

// Singleton instance for the app
let tokenManagerInstance: TokenManager | null = null

/**
 * Get the singleton TokenManager instance
 */
export function useTokenManager(): TokenManager {
  if (!tokenManagerInstance) {
    tokenManagerInstance = new TokenManager()
  }
  return tokenManagerInstance
}
