<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { session, isAuthenticated } = useAuthSession()
const { t } = useI18n()

const user = computed(() => session.value?.user)
const userInitial = computed(() => {
  if (!user.value?.username) {
    return null
  }
  return user.value.username.charAt(0).toUpperCase()
})

const userMenuItems = computed<DropdownMenuItem[]>(() => [
  {
    label: user.value?.username || t('common.user'),
    type: 'label' as const
  },
  {
    label: user.value?.email || '',
    type: 'label' as const,
    class: 'text-muted text-xs'
  },
  {
    type: 'separator' as const
  },
  {
    label: t('header.goToProfile'),
    icon: 'i-heroicons-user',
    to: '/profile'
  },
  {
    label: t('common.logout.button'),
    icon: 'i-heroicons-arrow-right-on-rectangle',
    color: 'error' as const,
    disabled: !isAuthenticated.value,
    to: '/sign-out',
    external: true
  }
])
</script>

<template>
  <div
    v-if="!isAuthenticated"
    class="flex items-center gap-2"
  >
    <UButton
      to="/sign-in"
      external
      color="primary"
      variant="solid"
      size="md"
    >
      {{ t('common.login') }}
    </UButton>
  </div>

  <UDropdownMenu
    v-else
    :items="userMenuItems"
    class="flex items-center gap-2"
  >
    <UAvatar
      v-if="user?.picture"
      class="rounded-none squircle"
      :src="user?.picture"
      :alt="user?.username || 'User Avatar'"
    />
    <div
      v-else-if="userInitial"
      class="w-8 h-8 rounded-none squircle bg-slate-200 dark:bg-slate-700 flex justify-center items-center font-bold text-slate-600 dark:text-slate-300"
    >
      {{ userInitial }}
    </div>
    <div
      v-else
      class="w-8 h-8 rounded-none squircle bg-slate-200 dark:bg-slate-700 flex justify-center items-center"
    >
      <UIcon
        name="heroicons:user-20-solid"
        class="w-5 h-5 text-slate-600 dark:text-slate-300"
      />
    </div>
  </UDropdownMenu>
</template>

<style lang="css" scoped>
.squircle {
  mask-image: url("data:image/svg+xml,%3csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M100 0C20 0 0 20 0 100s20 100 100 100 100-20 100-100S180 0 100 0Z'/%3e%3c/svg%3e");
  mask-size: contain;
  mask-position: center;
  mask-repeat: no-repeat;
}

.squircle:hover {
  opacity: 0.8;
  transition: opacity 0.2s ease-in-out;
  cursor: pointer;
}
</style>
