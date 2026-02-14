<script setup lang="ts">
const { t } = useI18n()

const activeSection = defineModel<string>('activeSection', { default: 'profile' })

interface NavItem {
  id: string
  icon: string
  label: string
}

const navItems: NavItem[] = [
  {
    id: 'profile',
    icon: 'i-lucide-user',
    label: 'profile.profileInfo'
  },
  {
    id: 'security',
    icon: 'i-lucide-shield',
    label: 'profile.security'
  },
  {
    id: 'danger',
    icon: 'i-lucide-alert-triangle',
    label: 'profile.dangerZone.title'
  }
]
</script>

<template>
  <div class="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
    <button
      v-for="item in navItems"
      :key="item.id"
      class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors"
      :class="[
        activeSection === item.id
          ? 'bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-400 shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
      ]"
      @click="activeSection = item.id"
    >
      <UIcon :name="item.icon" class="size-4 shrink-0" />
      <span class="truncate hidden sm:inline">{{ t(item.label) }}</span>
    </button>
  </div>
</template>
