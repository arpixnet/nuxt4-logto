import { computed } from 'vue'

/**
 * Auth Page Configuration Composable
 *
 * Provides configuration for authentication-related UI elements,
 * such as logo, branding, and styling options.
 *
 * Usage:
 * ```ts
 * const { config } = useAuthConfig()
 * ```
 */

export interface LogoConfig {
  imageUrl?: string
  size?: string
}

export interface AuthPageConfig {
  logo: LogoConfig
  appName: string
}

/**
 * Get authentication page configuration
 *
 * Returns configuration for auth-related UI elements.
 * Can be extended to read from runtime config or environment variables.
 */
export function useAuthConfig() {
  const config = useRuntimeConfig()

  const authPageConfig = computed<AuthPageConfig>(() => ({
    logo: {
      // Logo image URL - can be configured via env var
      imageUrl: config.public.authLogoImageUrl as string | undefined,
      // Logo text size - defaults to xl
      size: 'xl'
    },
    appName: config.public.appName as string
  }))

  return {
    config: authPageConfig
  }
}
