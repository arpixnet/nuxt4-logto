<script setup lang="ts">
/**
 * Sidebar Example Page
 *
 * Demonstrates the sidebar layout with vertical menu including children/submenus.
 */

definePageMeta({
  layout: 'sidebar',
  middleware: 'auth'
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Sidebar Example
      </h1>
      <p class="mt-1 text-gray-500 dark:text-gray-400">
        This page demonstrates the sidebar layout with a vertical menu that supports children (submenus).
      </p>
    </div>

    <!-- Feature Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-layers"
              class="h-5 w-5 text-primary"
            />
            <h3 class="font-semibold">
              Collapsible Sidebar
            </h3>
          </div>
        </template>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Click the toggle button to collapse the sidebar to icon-only view. Hover over icons to see tooltips.
        </p>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-folder-tree"
              class="h-5 w-5 text-primary"
            />
            <h3 class="font-semibold">
              Submenu Support
            </h3>
          </div>
        </template>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          The "Settings" menu item has children. Click to expand and see the submenu items.
        </p>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-smartphone"
              class="h-5 w-5 text-primary"
            />
            <h3 class="font-semibold">
              Mobile Responsive
            </h3>
          </div>
        </template>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          On mobile devices, the sidebar becomes a slide-out drawer with a hamburger menu.
        </p>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-shield"
              class="h-5 w-5 text-primary"
            />
            <h3 class="font-semibold">
              Role-Based Access
            </h3>
          </div>
        </template>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Menu items with roles are filtered based on user permissions. Admin-only items are hidden for regular users.
        </p>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-section"
              class="h-5 w-5 text-primary"
            />
            <h3 class="font-semibold">
              Section Labels
            </h3>
          </div>
        </template>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Use <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">type: 'label'</code> to create section headers like "Main", "Content", "Management".
        </p>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-external-link"
              class="h-5 w-5 text-primary"
            />
            <h3 class="font-semibold">
              External Links
            </h3>
          </div>
        </template>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Use <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">href</code> for external links. They automatically open in a new tab.
        </p>
      </UCard>
    </div>

    <!-- Code Example -->
    <UCard>
      <template #header>
        <h3 class="font-semibold">
          Configuration Example
        </h3>
      </template>
      <pre class="overflow-x-auto text-sm bg-gray-900 text-gray-100 p-4 rounded-lg"><code>// app/config/menus.ts
{
  label: 'Settings',
  icon: 'i-lucide-settings',
  defaultOpen: true, // Expand by default
  children: [
    { label: 'General', icon: 'i-lucide-sliders', to: '/settings/general' },
    { label: 'Security', icon: 'i-lucide-lock', to: '/settings/security' },
    { label: 'Notifications', icon: 'i-lucide-bell', to: '/settings/notifications' },
    { label: 'Integrations', icon: 'i-lucide-plug', to: '/settings/integrations' }
  ]
}</code></pre>
    </UCard>

    <!-- Usage Info -->
    <UAlert
      icon="i-lucide-info"
      color="primary"
      variant="subtle"
      title="How to Use"
    >
      <template #description>
        <p class="text-sm">
          To use this layout in any page, add <code class="text-xs bg-primary-100 dark:bg-primary-900 px-1 rounded">definePageMeta({ layout: 'sidebar' })</code> at the top of your page script.
        </p>
      </template>
    </UAlert>
  </div>
</template>
