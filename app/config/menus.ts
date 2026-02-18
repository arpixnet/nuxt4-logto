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
 */

import type { AppMenuItem, FooterColumn } from '../components/layout/menu/types'

/**
 * Main navigation menu (header)
 */
export const mainMenu: AppMenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'i-lucide-home',
    to: '/dashboard',
    roles: [] // Authenticated only
  },
  {
    label: 'GraphQL Demo',
    icon: 'i-lucide-database',
    to: '/examples/graphql',
    roles: []
  },
  {
    label: 'Resources',
    icon: 'i-lucide-folder',
    roles: [],
    children: [
      {
        label: 'Documentation',
        description: 'Learn how to use the boilerplate',
        icon: 'i-lucide-book-open',
        to: '/docs',
        roles: []
      },
      {
        label: 'Components',
        description: 'Reusable UI components',
        icon: 'i-lucide-box',
        to: '/components',
        roles: []
      },
      {
        label: 'Nuxt UI Docs',
        description: 'Official Nuxt UI documentation',
        icon: 'i-lucide-external-link',
        href: 'https://ui.nuxt.com',
        roles: []
      }
    ]
  },
  {
    label: 'Admin',
    icon: 'i-lucide-shield',
    roles: ['admin'],
    children: [
      {
        label: 'Users',
        description: 'Manage users and permissions',
        icon: 'i-lucide-users',
        to: '/admin/users',
        roles: ['admin']
      },
      {
        label: 'Settings',
        description: 'Application settings',
        icon: 'i-lucide-settings',
        to: '/admin/settings',
        roles: ['admin']
      }
    ]
  },
  {
    label: 'Public',
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
    label: 'Privacy Policy',
    to: '/privacy'
  },
  {
    label: 'Terms of Service',
    to: '/terms'
  },
  {
    label: 'Contact',
    to: '/contact'
  },
  {
    label: 'Documentation',
    href: 'https://docs.example.com',
    target: '_blank'
  },
  {
    label: 'GitHub',
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
    title: 'Product',
    links: [
      { label: 'Features', to: '/features' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Changelog', to: '/changelog' },
      { label: 'Roadmap', href: 'https://github.com/arpixnet/nuxt4-logto/projects' }
    ]
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: 'https://docs.example.com' },
      { label: 'API Reference', href: '/api' },
      { label: 'Tutorials', to: '/tutorials' },
      { label: 'Blog', to: '/blog' }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'Careers', to: '/careers' },
      { label: 'Partners', to: '/partners' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Cookie Policy', to: '/cookies' }
    ]
  }
]

/**
 * User dropdown menu (in header)
 */
export const userMenu: AppMenuItem[] = [
  {
    label: 'Profile',
    icon: 'i-lucide-user',
    to: '/profile',
    roles: []
  },
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/settings',
    roles: []
  },
  {
    divider: true,
    roles: []
  },
  {
    label: 'Sign Out',
    icon: 'i-lucide-log-out',
    to: '/sign-out',
    roles: []
  }
]

/**
 * Sidebar menu for admin/dashboard
 */
export const sidebarMenu: AppMenuItem[] = [
  {
    label: 'Main',
    type: 'label'
  },
  {
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/dashboard',
    roles: []
  },
  {
    label: 'Analytics',
    icon: 'i-lucide-bar-chart-2',
    to: '/analytics',
    roles: []
  },
  {
    label: 'Management',
    type: 'label',
    roles: ['admin']
  },
  {
    label: 'Users',
    icon: 'i-lucide-users',
    to: '/admin/users',
    roles: ['admin']
  },
  {
    label: 'Roles',
    icon: 'i-lucide-shield',
    to: '/admin/roles',
    roles: ['admin']
  },
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/settings',
    roles: []
  },
  {
    label: 'External',
    type: 'label'
  },
  {
    label: 'Nuxt UI',
    icon: 'i-lucide-external-link',
    href: 'https://ui.nuxt.com',
    roles: []
  },
  {
    label: 'Logto',
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
  user: userMenu,
  sidebar: sidebarMenu
} as const

export type MenuConfigKey = keyof typeof menuConfig
