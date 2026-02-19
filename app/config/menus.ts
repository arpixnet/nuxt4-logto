/**
 * Menu Configuration
 *
 * Centralized configuration for all menus in the application.
 * Modify this file to customize navigation for your project.
 *
 * Role-based access control:
 * - roles undefined: Public - visible to everyone
 * - roles [] (empty): Authenticated users only
 * - roles ['admin']: Users with 'admin' role only
 * - roles ['user', 'admin']: Users with any of the specified roles
 *
 * External links:
 * - Use `href` for external URLs (automatically opens in new tab with external icon)
 * - Use `target` to override default behavior
 *
 * i18n:
 * - Labels use i18n keys (e.g., 'menu.dashboard')
 * - Descriptions use i18n keys (e.g., 'menu.descriptions.documentation')
 * - Translation happens in useMenuConfig composable
 */

import type { AppMenuItem, FooterColumn } from '../components/layout/menu/types'

/**
 * Main navigation menu (header)
 */
export const mainMenu: AppMenuItem[] = [
  {
    label: 'menu.dashboard',
    icon: 'i-lucide-home',
    to: '/dashboard',
    roles: [] // Authenticated only
  },
  {
    label: 'menu.graphqlDemo',
    icon: 'i-lucide-database',
    to: '/examples/graphql',
    roles: []
  },
  {
    label: 'menu.resources',
    icon: 'i-lucide-folder',
    roles: [],
    children: [
      {
        label: 'menu.documentation',
        description: 'menu.descriptions.documentation',
        icon: 'i-lucide-book-open',
        to: '/docs',
        roles: []
      },
      {
        label: 'menu.sidebarExample',
        description: 'menu.descriptions.sidebarExample',
        icon: 'i-lucide-menu',
        to: '/examples/sidebar',
        roles: []
      },
      {
        label: 'menu.nuxtUiDocs',
        description: 'menu.descriptions.nuxtUiDocs',
        icon: 'i-lucide-external-link',
        href: 'https://ui.nuxt.com',
        roles: []
      }
    ]
  },
  {
    label: 'menu.admin',
    icon: 'i-lucide-shield',
    roles: ['user'],
    children: [
      {
        label: 'menu.users',
        description: 'menu.descriptions.users',
        icon: 'i-lucide-users',
        to: '/admin/users',
        roles: ['user']
      },
      {
        label: 'menu.settings',
        description: 'menu.descriptions.settings',
        icon: 'i-lucide-settings',
        to: '/admin/settings',
        roles: ['user']
      }
    ]
  },
  {
    label: 'menu.public',
    icon: 'i-lucide-globe',
    to: '/public'
    // No roles = visible to everyone
  }
]

/**
 * Footer menu (simple)
 * Note: External links automatically show external icon
 */
export const footerMenu: AppMenuItem[] = [
  {
    label: 'menu.privacyPolicy',
    to: '/privacy'
  },
  {
    label: 'menu.termsOfService',
    to: '/terms'
  },
  {
    label: 'menu.contact',
    to: '/contact'
  },
  {
    label: 'menu.documentation',
    href: 'https://docs.example.com',
    target: '_blank'
  },
  {
    label: 'menu.gitHub',
    href: 'https://github.com/arpixnet/nuxt4-logto',
    target: '_blank'
  }
]

/**
 * Footer menu with columns
 * Organized into columns with titles
 */
export const footerColumns: FooterColumn[] = [
  {
    title: 'menu.product',
    links: [
      { label: 'menu.features', to: '/features' },
      { label: 'menu.pricing', to: '/pricing' },
      { label: 'menu.changelog', to: '/changelog' },
      { label: 'menu.roadmap', href: 'https://github.com/arpixnet/nuxt4-logto/projects' }
    ]
  },
  {
    title: 'menu.resources',
    links: [
      { label: 'menu.documentation', href: 'https://docs.example.com' },
      { label: 'menu.apiReference', href: '/api' },
      { label: 'menu.tutorials', to: '/tutorials' },
      { label: 'menu.blog', to: '/blog' }
    ]
  },
  {
    title: 'menu.company',
    links: [
      { label: 'menu.about', to: '/about' },
      { label: 'menu.contact', to: '/contact' },
      { label: 'menu.careers', to: '/careers' },
      { label: 'menu.partners', to: '/partners' }
    ]
  },
  {
    title: 'menu.legal',
    links: [
      { label: 'menu.privacyPolicy', to: '/privacy' },
      { label: 'menu.termsOfService', to: '/terms' },
      { label: 'menu.cookiePolicy', to: '/cookies' }
    ]
  }
]

/**
 * Sidebar menu for admin/dashboard
 */
export const sidebarMenu: AppMenuItem[] = [
  {
    label: 'menu.main',
    type: 'label'
  },
  {
    label: 'menu.dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/dashboard',
    roles: []
  },
  {
    label: 'menu.analytics',
    icon: 'i-lucide-bar-chart-2',
    to: '/analytics',
    roles: []
  },
  {
    label: 'menu.content',
    type: 'label'
  },
  {
    label: 'menu.posts',
    icon: 'i-lucide-file-text',
    to: '/admin/posts',
    roles: []
  },
  {
    label: 'menu.media',
    icon: 'i-lucide-image',
    to: '/admin/media',
    roles: []
  },
  {
    label: 'menu.management',
    type: 'label',
    roles: ['admin']
  },
  {
    label: 'menu.users',
    icon: 'i-lucide-users',
    to: '/admin/users',
    roles: ['admin']
  },
  {
    label: 'menu.roles',
    icon: 'i-lucide-shield',
    to: '/admin/roles',
    roles: ['admin']
  },
  {
    label: 'menu.settings',
    icon: 'i-lucide-settings',
    roles: [],
    defaultOpen: true,
    children: [
      {
        label: 'menu.general',
        icon: 'i-lucide-sliders',
        to: '/settings/general',
        roles: []
      },
      {
        label: 'menu.security',
        icon: 'i-lucide-lock',
        to: '/settings/security',
        roles: []
      },
      {
        label: 'menu.notifications',
        icon: 'i-lucide-bell',
        to: '/settings/notifications',
        roles: []
      },
      {
        label: 'menu.integrations',
        icon: 'i-lucide-plug',
        to: '/settings/integrations',
        roles: []
      }
    ]
  },
  {
    label: 'menu.external',
    type: 'label'
  },
  {
    label: 'menu.nuxtUi',
    icon: 'i-lucide-external-link',
    href: 'https://ui.nuxt.com',
    roles: []
  },
  {
    label: 'menu.logto',
    icon: 'i-lucide-external-link',
    href: 'https://docs.logto.io',
    roles: []
  }
]

/**
 * All menu configurations
 * Access via useMenuConfig().getMenu('main')
 */
export const menuConfig = {
  main: mainMenu,
  footer: footerMenu,
  footerColumns: footerColumns,
  sidebar: sidebarMenu
} as const

export type MenuConfigKey = keyof typeof menuConfig
