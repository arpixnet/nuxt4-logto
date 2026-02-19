<script setup lang="ts">
/**
 * AppMenu Component
 *
 * A flexible menu component that wraps Nuxt UI NavigationMenu.
 * Supports four variants: horizontal, vertical, footer, and footer-columns.
 *
 * Features:
 * - Role-based filtering (via useMenuConfig)
 * - Submenus support (horizontal and vertical only)
 * - Collapsible sidebar (vertical variant)
 * - External link detection with icon
 * - Active route highlighting
 * - Footer with columns layout
 *
 * Usage:
 * ```vue
 * <AppMenu menu="main" variant="horizontal" />
 * <AppMenu menu="sidebar" variant="vertical" :collapsed="isCollapsed" />
 * <AppMenu menu="footer" variant="footer" />
 * <AppMenu menu="footerColumns" variant="footer-columns" />
 * ```
 */

import type { NavigationMenuItem } from '@nuxt/ui'
import type { AppMenuItem, MenuVariant } from './types'

const props = withDefaults(defineProps<{
  /** Name of the menu in config/menus.ts */
  menu: string
  /** Layout variant */
  variant?: MenuVariant
  /** Whether the vertical menu is collapsed (icon only) */
  collapsed?: boolean
  /** Whether to show icons */
  showIcons?: boolean
  /** Custom class */
  class?: string
  /** Number of columns for footer-columns variant (default: 4) */
  columns?: number
}>(), {
  variant: 'horizontal',
  collapsed: false,
  showIcons: undefined,
  class: '',
  columns: 4
})

const { getMenu, getFooterColumns } = useMenuConfig()
const route = useRoute()

// Get filtered menu items - filtering is handled internally by useMenuConfig
const menuItems = computed(() => getMenu(props.menu))

// Get footer columns for footer-columns variant
const footerColumnData = computed(() => getFooterColumns())

// Determine if icons should be shown
const shouldShowIcons = computed(() => {
  if (props.showIcons !== undefined) return props.showIcons
  return props.variant !== 'footer' && props.variant !== 'footer-columns'
})

// Check if a path is active
function isActivePath(itemPath: string | undefined): boolean {
  if (!itemPath) return false

  // External links are never active
  if (itemPath.startsWith('http')) return false

  // Exact match or starts with for nested routes
  return route.path === itemPath || route.path.startsWith(itemPath + '/')
}

// Check if item is an external link
function isExternalLink(item: AppMenuItem): boolean {
  if (item.href) return true
  if (item.to?.startsWith('http')) return true
  return false
}

// Convert AppMenuItem to NavigationMenuItem format
function toNavigationMenuItem(item: AppMenuItem): NavigationMenuItem {
  const navItem: NavigationMenuItem = {
    label: item.label || ''
  }

  // Icons
  if (shouldShowIcons.value && item.icon) {
    navItem.icon = item.icon
  }

  // Handle external vs internal links
  if (item.href || (item.to?.startsWith('http'))) {
    navItem.to = item.href || item.to
    navItem.target = item.target || '_blank'
  } else if (item.to) {
    navItem.to = item.to
    // Active state for internal links
    if (isActivePath(item.to)) {
      navItem.active = true
    }
  }

  if (item.target) {
    navItem.target = item.target
  }

  if (item.description) {
    navItem.description = item.description
  }

  if (item.badge !== undefined) {
    navItem.badge = item.badge
  }

  if (item.disabled) {
    navItem.disabled = true
  }

  if (item.defaultOpen) {
    navItem.defaultOpen = true
  }

  if (item.type) {
    navItem.type = item.type
  }

  if (item.onSelect) {
    navItem.onSelect = item.onSelect
  }

  // Convert children recursively (not for footer variants)
  if (item.children && props.variant !== 'footer' && props.variant !== 'footer-columns') {
    navItem.children = item.children.map(toNavigationMenuItem)
  }

  return navItem
}

// Convert menu items to Nuxt UI format
const navigationItems = computed<NavigationMenuItem[]>(() => {
  // For footer-columns, return empty (handled separately)
  if (props.variant === 'footer-columns') return []

  return (menuItems.value as AppMenuItem[])
    .filter((item: AppMenuItem) => item.label) // Filter out dividers for NavigationMenu
    .map(toNavigationMenuItem)
})

// Footer items for simple footer variant
const footerItems = computed(() => {
  if (props.variant !== 'footer') return []
  return menuItems.value as AppMenuItem[]
})
</script>

<template>
  <!-- Horizontal: Full NavigationMenu -->
  <template v-if="variant === 'horizontal'">
    <UNavigationMenu
      :items="navigationItems"
      orientation="horizontal"
      highlight
      :class="[
        'data-[orientation=horizontal]:w-full data-[orientation=horizontal]:justify-center',
        props.class
      ]"
    />
  </template>

  <!-- Vertical: Collapsible sidebar menu -->
  <template v-else-if="variant === 'vertical'">
    <UNavigationMenu
      :items="navigationItems"
      orientation="vertical"
      :collapsed="collapsed"
      :tooltip="collapsed"
      :class="[
        'data-[orientation=vertical]:w-full',
        props.class
      ]"
    />
  </template>

  <!-- Footer: Simple vertical list with external link icons -->
  <template v-else-if="variant === 'footer'">
    <nav
      :class="['flex flex-wrap items-center justify-center gap-x-6 gap-y-2', props.class]"
    >
      <template
        v-for="item in footerItems"
        :key="item.label"
      >
        <!-- Divider -->
        <span
          v-if="item.divider"
          class="hidden"
        />

        <!-- Link -->
        <NuxtLink
          v-else
          :to="item.to"
          :href="item.href"
          :target="item.target || (isExternalLink(item) ? '_blank' : undefined)"
          class="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          :class="{ 'opacity-50 pointer-events-none': item.disabled }"
        >
          {{ item.label }}
          <UIcon
            v-if="isExternalLink(item)"
            name="i-lucide-external-link"
            class="h-3 w-3"
          />
        </NuxtLink>
      </template>
    </nav>
  </template>

  <!-- Footer Columns: Multiple columns with titles -->
  <template v-else-if="variant === 'footer-columns'">
    <div
      :class="[
        'grid gap-8',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        props.class
      ]"
    >
      <div
        v-for="column in footerColumnData"
        :key="column.title"
        class="space-y-3"
      >
        <!-- Column Title -->
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
          {{ column.title }}
        </h3>

        <!-- Column Links -->
        <ul class="space-y-2">
          <li
            v-for="link in column.links"
            :key="link.label"
          >
            <NuxtLink
              :to="link.to"
              :href="link.href"
              :target="link.target || (isExternalLink(link) ? '_blank' : undefined)"
              class="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              :class="{ 'opacity-50 pointer-events-none': link.disabled }"
            >
              {{ link.label }}
              <UIcon
                v-if="isExternalLink(link)"
                name="i-lucide-external-link"
                class="h-3 w-3"
              />
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </template>
</template>
