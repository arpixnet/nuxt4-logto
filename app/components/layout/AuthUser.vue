<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { session, isAuthenticated } = useAuthSession()
const { t } = useI18n()
const clientLogger = useClientLogger()
const user = computed(() => session.value?.user)

// Log user authentication status changes
watchEffect(() => {
  if (isAuthenticated.value && user.value) {
    clientLogger.debug('auth-user', 'Authenticated user rendered', {
      userId: user.value.sub,
      username: user.value.username
    })
  } else if (!isAuthenticated.value) {
    clientLogger.debug('auth-user', 'Not authenticated, showing login button')
  }
})

const userInitial = computed(() => {
  if (!user.value?.username) {
    if (isAuthenticated.value) {
      clientLogger.warn('auth-user', 'User authenticated but username missing', {
        userId: user.value?.sub
      })
    }
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
