<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { session, isAuthenticated } = useAuthSession()
const { t } = useI18n()
const clientLogger = useClientLogger()
const user = computed(() => session.value?.user)

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
    external: true,
    onSelect: () => {
      clientLogger.info('auth-user', 'Logout button clicked', {
        userId: user.value?.sub
      })
    }
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
    <UiUserAvatar size="sm" />
  </UDropdownMenu>
</template>
