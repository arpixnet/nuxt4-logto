<script setup lang="ts">
/**
 * Sidebar Layout
 *
 * A layout with a collapsible sidebar navigation.
 * Uses AppMenu with variant="vertical" for the sidebar menu.
 */

import { useMediaQuery, useLocalStorage } from '@vueuse/core'

// Persist sidebar state in localStorage to survive page refreshes and navigation
const isCollapsed = useLocalStorage('sidebar-collapsed', false)
const isMobileOpen = ref(false)
const isMobile = useMediaQuery('(max-width: 1023px)')

// Track if initial hydration is complete to prevent flash
const isHydrated = ref(false)

onMounted(() => {
  // Wait for next tick to ensure DOM is ready before enabling transitions
  nextTick(() => {
    isHydrated.value = true
  })
})

function toggleSidebar() {
  if (isMobile.value) {
    isMobileOpen.value = !isMobileOpen.value
  } else {
    isCollapsed.value = !isCollapsed.value
  }
}

function closeMobileSidebar() {
  isMobileOpen.value = false
}

// Provide toggle function to child components
provide('toggleSidebar', toggleSidebar)
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Mobile Header -->
    <header class="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-white px-4 lg:hidden dark:bg-gray-900 dark:border-gray-800">
      <UButton
        icon="i-lucide-menu"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="toggleSidebar"
      />
      <LayoutAppLogo class="h-5 w-auto" />
    </header>

    <div class="flex">
      <!-- Desktop Sidebar -->
      <aside
        class="fixed left-0 top-0 z-30 h-screen border-r bg-white dark:bg-gray-900 dark:border-gray-800 hidden lg:block"
        :class="[
          isCollapsed ? 'w-16' : 'w-64',
          isHydrated ? 'transition-all duration-300' : ''
        ]"
      >
        <!-- Sidebar Header -->
        <div
          class="flex h-14 items-center border-b px-4 dark:border-gray-800"
          :class="isCollapsed ? 'justify-center' : 'justify-between'"
        >
          <LayoutAppLogo
            v-if="!isCollapsed"
            class="h-5 w-auto"
          />
          <UButton
            :icon="isCollapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="toggleSidebar"
          />
        </div>

        <!-- Sidebar Menu -->
        <div class="h-[calc(100vh-3.5rem)] overflow-y-auto p-3">
          <LayoutMenuAppMenu
            menu="sidebar"
            variant="vertical"
            :collapsed="isCollapsed"
          />
        </div>
      </aside>

      <!-- Mobile Sidebar Overlay -->
      <Teleport to="body">
        <Transition name="fade">
          <div
            v-if="isMobileOpen"
            class="fixed inset-0 z-40 bg-black/50 lg:hidden"
            @click="closeMobileSidebar"
          />
        </Transition>
      </Teleport>

      <!-- Mobile Sidebar -->
      <Teleport to="body">
        <Transition name="slide">
          <aside
            v-if="isMobileOpen"
            class="fixed left-0 top-0 z-50 h-screen w-64 border-r bg-white dark:bg-gray-900 dark:border-gray-800 lg:hidden"
          >
            <!-- Mobile Sidebar Header -->
            <div class="flex h-14 items-center justify-between border-b px-4 dark:border-gray-800">
              <LayoutAppLogo class="h-5 w-auto" />
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="closeMobileSidebar"
              />
            </div>

            <!-- Mobile Sidebar Menu -->
            <div class="h-[calc(100vh-3.5rem)] overflow-y-auto p-3">
              <LayoutMenuAppMenu
                menu="sidebar"
                variant="vertical"
                @click="closeMobileSidebar"
              />
            </div>
          </aside>
        </Transition>
      </Teleport>

      <!-- Main Content -->
      <main
        class="flex-1"
        :class="[
          isCollapsed ? 'lg:ml-16' : 'lg:ml-64',
          isHydrated ? 'transition-all duration-300' : ''
        ]"
      >
        <div class="container mx-auto p-6">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
