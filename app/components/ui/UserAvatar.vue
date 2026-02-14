<script setup lang="ts">
const { session } = useAuthSession()
const clientLogger = useClientLogger()

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showStatus?: boolean
}>(), {
  size: 'md',
  showStatus: false
})

const user = computed(() => session.value?.user)

// Size mappings
const sizeClasses = {
  sm: {
    container: 'w-8 h-8',
    text: 'text-sm',
    icon: 'size-4',
    status: 'w-2 h-2',
    statusRing: 'ring-1'
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-base',
    icon: 'size-5',
    status: 'w-2 h-2',
    statusRing: 'ring-1'
  },
  lg: {
    container: 'w-14 h-14',
    text: 'text-xl',
    icon: 'size-7',
    status: 'w-2.5 h-2.5',
    statusRing: 'ring-2'
  },
  xl: {
    container: 'w-20 h-20',
    text: 'text-2xl',
    icon: 'size-10',
    status: 'w-3 h-3',
    statusRing: 'ring-2'
  }
}

const sizes = computed(() => sizeClasses[props.size])

// Get initials from name or email
const initials = computed(() => {
  const name = user.value?.name || user.value?.username || user.value?.email || ''
  if (!name) return null

  // Log warning if username is missing but user is authenticated
  if (!user.value?.username && session.value?.isAuthenticated) {
    clientLogger.warn('user-avatar', 'User authenticated but username missing', {
      userId: user.value?.sub
    })
  }

  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

// Avatar source - uses picture from Logto
const avatarSrc = computed(() => user.value?.picture)
</script>

<template>
  <div class="relative inline-block">
    <!-- Avatar with image -->
    <UAvatar
      v-if="avatarSrc"
      :src="avatarSrc"
      :alt="user?.name || user?.username || 'User'"
      class="rounded-none squircle"
      :class="sizes.container"
    />

    <!-- Avatar with initials fallback -->
    <div
      v-else-if="initials"
      class="rounded-none squircle bg-slate-200 dark:bg-slate-700 flex justify-center items-center font-bold text-slate-600 dark:text-slate-300"
      :class="[sizes.container, sizes.text]"
    >
      {{ initials }}
    </div>

    <!-- Avatar with icon fallback -->
    <div
      v-else
      class="rounded-none squircle bg-slate-200 dark:bg-slate-700 flex justify-center items-center"
      :class="sizes.container"
    >
      <UIcon
        name="i-heroicons-user-20-solid"
        :class="sizes.icon"
        class="text-slate-600 dark:text-slate-300"
      />
    </div>

    <!-- Online status indicator -->
    <div
      v-if="showStatus"
      class="absolute -bottom-0.5 -right-0.5 bg-success-500 rounded-full"
      :class="[sizes.status, sizes.statusRing]"
      class-ring="ring-white dark:ring-gray-900"
    />
  </div>
</template>
