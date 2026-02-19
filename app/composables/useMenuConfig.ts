/**
 * Menu Configuration Composable
 *
 * Provides access to menu configurations with role-based filtering.
 * Integrates with Logto authentication to filter menu items based on user roles.
 *
 * Usage:
 * ```ts
 * const { getMenu, hasRole, isAuthenticated } = useMenuConfig()
 * const items = getMenu('main') // Returns filtered menu items
 * ```
 */

import { menuConfig, footerColumns, type MenuConfigKey } from '../config/menus'
import type { AppMenuItem, FooterColumn } from '../components/layout/menu/types'

/**
 * Check if a menu item is accessible by the user
 */
function isItemAccessible(
  item: AppMenuItem,
  isAuthenticated: boolean,
  userRoles: string[]
): boolean {
  // No roles specified = public access
  if (item.roles === undefined) {
    return true
  }

  // Empty roles array = authenticated users only
  if (item.roles.length === 0) {
    return isAuthenticated
  }

  // Specific roles = must have at least one matching role
  return item.roles.some(role => userRoles.includes(role))
}

/**
 * Filter menu items recursively based on user roles
 */
function filterMenuItems(
  items: AppMenuItem[],
  isAuthenticated: boolean,
  userRoles: string[]
): AppMenuItem[] {
  return items
    .filter(item => isItemAccessible(item, isAuthenticated, userRoles))
    .map((item) => {
      // Recursively filter children
      if (item.children) {
        const filteredChildren = filterMenuItems(
          item.children,
          isAuthenticated,
          userRoles
        )

        // If item has children but none are accessible, hide the parent too
        if (filteredChildren.length === 0) {
          return null
        }

        return { ...item, children: filteredChildren }
      }

      return item
    })
    .filter((item): item is AppMenuItem => item !== null)
}

/**
 * Menu Configuration Composable
 *
 * Provides filtered menu items based on user authentication and roles.
 */
export function useMenuConfig() {
  const { isAuthenticated, session } = useAuthSession()

  // Track if auth state has been resolved on client (to avoid hydration mismatch)
  const authResolved = ref(false)

  // Get user roles reactively from session
  const userRoles = computed<string[]>(() => {
    if (import.meta.server) {
      return []
    }

    const user = session.value?.user as Record<string, unknown> | undefined
    if (!user) {
      return []
    }

    const roles = user.roles
    if (!Array.isArray(roles)) {
      return []
    }

    return roles
      .map(r => (typeof r === 'string' ? r : (r as Record<string, unknown>)?.name as string))
      .filter(Boolean)
  })

  // Mark auth as resolved after initial client mount
  if (import.meta.client) {
    onMounted(() => {
      // Small delay to ensure Logto has hydrated
      nextTick(() => {
        authResolved.value = true
      })
    })
  }

  /**
   * Get a menu by name with role-based filtering applied
   */
  function getMenu(name: string): AppMenuItem[] {
    const items = menuConfig[name as MenuConfigKey]

    if (!items) {
      console.warn(`[useMenuConfig] Menu "${name}" not found in config`)
      return []
    }

    const menuItems = items as AppMenuItem[]

    // For SSR, only return truly public items (undefined roles)
    // This prevents hydration mismatch
    if (import.meta.server) {
      return menuItems.filter((item) => {
        // Only public items (no roles defined)
        if (item.roles === undefined) return true
        // Hide authenticated and role-restricted items in SSR
        return false
      })
    }

    // On client, wait for auth to resolve before showing authenticated items
    // During initial hydration, only show public items
    if (!authResolved.value) {
      return menuItems.filter((item) => {
        if (item.roles === undefined) return true
        return false
      })
    }

    return filterMenuItems(
      menuItems,
      isAuthenticated.value,
      userRoles.value
    )
  }

  /**
   * Get footer columns with role-based filtering applied
   */
  function getFooterColumns(): FooterColumn[] {
    // Filter links in each column based on roles
    return footerColumns.map(column => ({
      title: column.title,
      links: column.links.filter((link) => {
        // SSR: only show truly public items
        if (import.meta.server) {
          if (link.roles === undefined) return true
          return false
        }

        // Client during hydration: only show public items
        if (!authResolved.value) {
          if (link.roles === undefined) return true
          return false
        }

        // Client after hydration: use normal filtering
        return isItemAccessible(link, isAuthenticated.value, userRoles.value)
      })
    })).filter(column => column.links.length > 0)
  }

  /**
   * Check if current user has a specific role
   */
  function hasRole(role: string): boolean {
    return userRoles.value.includes(role)
  }

  /**
   * Check if current user has any of the specified roles
   */
  function hasAnyRole(roles: string[]): boolean {
    return roles.some(role => userRoles.value.includes(role))
  }

  /**
   * Check if current user has all of the specified roles
   */
  function hasAllRoles(roles: string[]): boolean {
    return roles.every(role => userRoles.value.includes(role))
  }

  return {
    getMenu,
    getFooterColumns,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    userRoles: readonly(userRoles),
    isAuthenticated
  }
}
