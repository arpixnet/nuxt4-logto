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
 * Get user roles from Logto session
 */
function getUserRoles(): string[] {
  // Only run on client side
  if (import.meta.server) {
    return []
  }

  try {
    // Access Logto user from the session
    const { session } = useAuthSession()
    const user = session.value?.user as Record<string, unknown> | undefined

    if (!user) {
      return []
    }

    // Get roles from the user object
    // Logto stores roles in custom_data or as a direct property
    const roles = user.roles

    if (!Array.isArray(roles)) {
      return []
    }

    return roles
      .map(r => (typeof r === 'string' ? r : (r as Record<string, unknown>)?.name as string))
      .filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Menu Configuration Composable
 *
 * Provides filtered menu items based on user authentication and roles.
 */
export function useMenuConfig() {
  const { isAuthenticated } = useAuthSession()
  const userRoles = ref<string[]>([])

  // Update roles when auth state changes
  if (import.meta.client) {
    watch(isAuthenticated, () => {
      userRoles.value = getUserRoles()
    }, { immediate: true })
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

    // For SSR, return items that don't require specific roles
    // (public + authenticated items, but not role-restricted)
    if (import.meta.server) {
      return menuItems.filter((item) => {
        // Public items
        if (item.roles === undefined) return true
        // Authenticated-only items (empty array)
        if (item.roles?.length === 0) return true
        // Role-restricted items - hide in SSR
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
        // SSR: show public + authenticated only
        if (import.meta.server) {
          if (link.roles === undefined) return true
          if (link.roles?.length === 0) return true
          return false
        }

        // Client: use normal filtering
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
