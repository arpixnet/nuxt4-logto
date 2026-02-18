<script setup lang="ts">
/**
 * AppMenuMobile Component
 *
 * Mobile menu with hamburger button and drawer.
 * Uses Nuxt UI Drawer component for smooth animations.
 *
 * Features:
 * - Hamburger button with animation
 * - Slide-in drawer from left
 * - Full vertical navigation menu inside drawer
 * - Auto-close on route change
 */

import type { NavigationMenuItem } from '@nuxt/ui'

const props = defineProps<{
  /** Menu items to display */
  items: NavigationMenuItem[]
  /** Custom class */
  class?: string
}>()

const open = ref(false)
const route = useRoute()

// Close drawer when route changes
watch(() => route.path, () => {
  open.value = false
})

// Toggle menu
function toggleMenu() {
  open.value = !open.value
}

// Close menu
function closeMenu() {
  open.value = false
}
</script>

<template>
  <div :class="props.class">
    <!-- Hamburger Button -->
    <UButton
      :icon="open ? 'i-lucide-x' : 'i-lucide-menu'"
      color="neutral"
      variant="ghost"
      size="lg"
      aria-label="Toggle menu"
      @click="toggleMenu"
    />

    <!-- Drawer with Menu -->
    <UDrawer
      v-model:open="open"
      direction="left"
      :ui="{
        content: 'w-80 max-w-[85vw]'
      }"
    >
      <template #content>
        <div class="flex h-full flex-col">
          <!-- Drawer Header -->
          <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
            <span class="text-lg font-semibold">
              Menu
            </span>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="closeMenu"
            />
          </div>

          <!-- Navigation Menu -->
          <div class="flex-1 overflow-y-auto p-4">
            <UNavigationMenu
              :items="items"
              orientation="vertical"
              class="w-full"
              highlight
            />
          </div>
        </div>
      </template>
    </UDrawer>
  </div>
</template>
