/**
 * Menu System Types
 *
 * Extended types for the flexible menu system that wraps Nuxt UI NavigationMenu.
 * Supports role-based authorization, submenus, and multiple layout variants.
 */

import type { AvatarProps, ChipProps, TooltipProps } from '@nuxt/ui'

/**
 * Menu item for the AppMenu component
 *
 * Extends Nuxt UI NavigationMenuItem with role-based authorization.
 */
export interface AppMenuItem {
  // === Core Properties (from Nuxt UI) ===

  /** Display text for the menu item (optional if divider is true) */
  label?: string

  /** Icon class (e.g., 'i-lucide-home') */
  icon?: string

  /** Internal route path (uses NuxtLink) */
  to?: string

  /** External URL */
  href?: string

  /** Link target (e.g., '_blank' for external links) */
  target?: string

  /** Description text for submenu items */
  description?: string

  /** Badge text or number */
  badge?: string | number

  /** Avatar configuration */
  avatar?: AvatarProps

  /** Chip configuration */
  chip?: ChipProps

  /** Tooltip configuration */
  tooltip?: TooltipProps | boolean

  /** Whether the item is disabled */
  disabled?: boolean

  /** Whether this item is currently active */
  active?: boolean

  /** Whether to open the submenu by default (vertical only) */
  defaultOpen?: boolean

  /** Item type: 'label' for section headers, 'link' for links */
  type?: 'label' | 'link'

  // === Extension Properties ===

  /**
   * Role-based access control
   * - undefined: Public - visible to everyone (including unauthenticated)
   * - [] (empty array): Authenticated users only
   * - ['admin']: Users with 'admin' role only
   * - ['user', 'admin']: Users with any of the specified roles
   */
  roles?: string[]

  /**
   * Submenu children (not supported in 'footer' variant)
   */
  children?: AppMenuItem[]

  /**
   * Custom click handler
   */
  onSelect?: () => void

  /**
   * Visual divider before this item
   */
  divider?: boolean

  /**
   * Custom CSS class
   */
  class?: string
}

/**
 * Menu variant type
 */
export type MenuVariant = 'horizontal' | 'vertical' | 'footer' | 'footer-columns'

/**
 * Footer column configuration
 */
export interface FooterColumn {
  /** Column title */
  title: string
  /** Column links */
  links: AppMenuItem[]
}

/**
 * Props for the AppMenu component
 */
export interface AppMenuProps {
  /** Name of the menu in config/menus.ts */
  menu: string

  /** Layout variant */
  variant?: MenuVariant

  /** Whether the vertical menu is collapsed (icon only) */
  collapsed?: boolean

  /** Whether to show icons (default: true for horizontal/vertical, false for footer) */
  showIcons?: boolean

  /** Custom class for the menu container */
  class?: string

  /** Mobile breakpoint in pixels (default: 768) */
  mobileBreakpoint?: number
}

/**
 * Menu configuration object
 */
export interface MenuConfig {
  [menuName: string]: AppMenuItem[] | FooterColumn[]
}

/**
 * Composable return type
 */
export interface UseMenuConfigReturn {
  /** Get filtered menu items by name */
  getMenu: (name: string) => AppMenuItem[]

  /** Check if user has access to a specific role */
  hasRole: (role: string) => boolean

  /** Check if user has any of the specified roles */
  hasAnyRole: (roles: string[]) => boolean

  /** Current user's roles */
  userRoles: Ref<string[]>

  /** Whether user is authenticated */
  isAuthenticated: Ref<boolean>
}
