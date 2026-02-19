# Menu System

This document describes the architecture and creation of menus in the project.

## System Architecture

The menu system is composed of several key files:

| File | Purpose |
|------|---------|
| `app/config/menus.ts` | Centralized configuration of all menus |
| `app/composables/useMenuConfig.ts` | Composable for management with permissions and translation |
| `app/components/layout/menu/AppMenu.vue` | Main flexible menu component |
| `app/components/layout/menu/types.ts` | TypeScript type definitions |

## Menu Types

The system supports four variants:

| Variant | Use Case |
|---------|----------|
| `horizontal` | Top navigation (header) |
| `vertical` | Collapsible sidebars |
| `footer` | Simple list in footer |
| `footer-columns` | Multiple columns with titles in footer |

## Menu Item Structure

```typescript
interface MenuItem {
  label: string          // i18n key (e.g., 'menu.dashboard')
  to?: string           // Internal route
  href?: string         // External URL
  icon?: string         // Icon name
  roles?: string[]      // Allowed roles (undefined = public)
  children?: MenuItem[] // Submenus
  badge?: string        // Notification badge
  chip?: string         // Info chip
  divider?: boolean     // Visual separator
  disabled?: boolean    // Disabled item
}
```

## Role and Permission System

### Access Levels

| Configuration | Access |
|---------------|--------|
| `roles: undefined` | Public - visible to everyone |
| `roles: []` (empty) | Authenticated users only |
| `roles: ['admin']` | Users with 'admin' role only |
| `roles: ['user', 'admin']` | Users with any of the roles |

### Example

```typescript
const menuItems: MenuItem[] = [
  { label: 'menu.home', to: '/' },                    // Public
  { label: 'menu.dashboard', to: '/dashboard' },      // Authenticated
  { label: 'menu.admin', to: '/admin', roles: ['admin'] } // Admins only
]
```

## Available Menus

### Main Menu (Header)

Located in the top navigation bar:

```typescript
const mainMenu: MenuItem[] = [
  { label: 'menu.dashboard', to: '/dashboard' },
  {
    label: 'menu.resources',
    children: [
      { label: 'menu.documentation', to: '/docs' },
      { label: 'menu.nuxtui', href: 'https://ui.nuxt.com' }
    ]
  },
  {
    label: 'menu.admin',
    roles: ['admin'],
    children: [
      { label: 'menu.users', to: '/admin/users' },
      { label: 'menu.settings', to: '/admin/settings' }
    ]
  }
]
```

### Sidebar Menu

Hierarchical structure for lateral navigation:

```typescript
const sidebarMenu: MenuItem[] = [
  { label: 'menu.dashboard', to: '/dashboard', icon: 'i-heroicons-home' },
  {
    label: 'menu.analytics',
    icon: 'i-heroicons-chart-bar',
    children: [
      { label: 'menu.overview', to: '/analytics' },
      { label: 'menu.reports', to: '/analytics/reports' }
    ]
  },
  { divider: true },
  { label: 'menu.settings', to: '/settings', icon: 'i-heroicons-cog' }
]
```

### Footer Menu

Simple link list:

```typescript
const footerMenu: MenuItem[] = [
  { label: 'menu.privacy', to: '/privacy' },
  { label: 'menu.terms', to: '/terms' },
  { label: 'menu.contact', href: 'mailto:contact@example.com' }
]
```

### Footer with Columns

Multiple organized columns:

```typescript
const footerColumns: MenuColumn[] = [
  {
    title: 'footer.product',
    items: [
      { label: 'footer.features', to: '/features' },
      { label: 'footer.pricing', to: '/pricing' }
    ]
  },
  {
    title: 'footer.company',
    items: [
      { label: 'footer.about', to: '/about' },
      { label: 'footer.contact', to: '/contact' }
    ]
  }
]
```

## Internationalization

All labels use i18n keys. The `useMenuConfig` composable applies translations automatically.

### Translation Files

```json
// i18n/locales/en.json
{
  "menu": {
    "dashboard": "Dashboard",
    "settings": "Settings",
    "admin": "Administration"
  }
}

// i18n/locales/es.json
{
  "menu": {
    "dashboard": "Panel de Control",
    "settings": "Configuracion",
    "admin": "Administracion"
  }
}
```

## Usage in Components

### Horizontal Menu

```vue
<template>
  <LayoutMenuAppMenu menu="main" variant="horizontal" />
</template>
```

### Collapsible Vertical Menu

```vue
<script setup>
const collapsed = ref(false)
</script>

<template>
  <LayoutMenuAppMenu
    menu="sidebar"
    variant="vertical"
    :collapsed="collapsed"
    @toggle="collapsed = !collapsed"
  />
</template>
```

### Footer with Columns

```vue
<template>
  <LayoutMenuAppMenu menu="footerColumns" variant="footer-columns" />
</template>
```

## Navigation Components

### AppHeader

- Logo on the left
- Main horizontal menu (desktop)
- Language selector and dark mode on the right
- Vertical menu for mobile

### Sidebar

- Collapsible sidebar persisted in localStorage
- Responsive support with mobile overlay menu
- Smooth transition animations

### AppFooter

- Footer with organized columns
- Copyright information and links

## Advanced Features

### External Links

Automatic detection of external links:

- Built-in external link icon
- Target `_blank` by default
- `rel="noopener noreferrer"` automatically

### Active State

Automatic highlighting of current route:

```typescript
// Detects nested routes
{ label: 'menu.users', to: '/admin/users' }
// Active on /admin/users and /admin/users/123
```

### SSR and Hydration

The system handles differences between SSR and client:

- Shows only public items during initialization
- Avoids hydration mismatch issues
- Waits for session to hydrate before filtering

## Creating a New Menu

### 1. Define the Menu

In `app/config/menus.ts`:

```typescript
export const customMenu: MenuItem[] = [
  { label: 'menu.custom.home', to: '/custom' },
  { label: 'menu.custom.list', to: '/custom/list' }
]
```

### 2. Add to Composable

In `app/composables/useMenuConfig.ts`:

```typescript
const menus = {
  main: mainMenu,
  sidebar: sidebarMenu,
  footer: footerMenu,
  footerColumns: footerColumns,
  custom: customMenu  // Add here
}
```

### 3. Add Translations

In `i18n/locales/en.json` and `es.json`:

```json
{
  "menu": {
    "custom": {
      "home": "Custom Home",
      "list": "Custom List"
    }
  }
}
```

### 4. Use the Menu

```vue
<template>
  <LayoutMenuAppMenu menu="custom" variant="vertical" />
</template>
```

## Customization

### Badges and Chips

```typescript
{
  label: 'menu.inbox',
  to: '/inbox',
  badge: '5',      // Notification badge
  chip: 'New'      // Info chip
}
```

### Dividers

```typescript
[
  { label: 'menu.item1', to: '/item1' },
  { divider: true },
  { label: 'menu.item2', to: '/item2' }
]
```

### Disabled States

```typescript
{
  label: 'menu.comingSoon',
  disabled: true
}
```

## Best Practices

1. **Use i18n keys**: Always use keys instead of hardcoded text
2. **Group by functionality**: Organize related items together
3. **Limit depth**: Maximum 2 levels of submenus
4. **Specific roles**: Define minimum required roles
5. **Consistent icons**: Use the same icon set (Heroicons recommended)
