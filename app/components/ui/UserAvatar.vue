<script setup lang="ts">
const { session } = useAuthSession()
const clientLogger = useClientLogger()

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>(), {
  size: 'md'
})

const user = computed(() => session.value?.user)

// Size mappings for container and image dimensions
const sizeConfig = {
  sm: { container: 32, image: 64 },
  md: { container: 40, image: 128 },
  lg: { container: 56, image: 256 },
  xl: { container: 80, image: 512 }
}

const config = computed(() => sizeConfig[props.size])

// Get initials from name or email
const initials = computed(() => {
  const name = user.value?.name || user.value?.username || user.value?.email || ''
  if (!name) return null

  // Log warning if username is missing but user is authenticated
  if (!user.value?.username && session.value) {
    clientLogger.warn('user-avatar', 'User authenticated but username missing', {
      userId: user.value?.sub
    })
  }

  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

// Avatar source - uses avatarUrl from custom_data, fallback to picture from Logto
const avatarSrc = computed(() => {
  const customData = user.value?.custom_data as { avatarUrl?: string } | undefined
  return customData?.avatarUrl || user.value?.picture
})

// Check if avatar is a local API URL (uploaded via our system)
const isLocalAvatar = computed(() =>
  avatarSrc.value?.startsWith('/api/avatar/file/')
)

// Build optimized image URL for NuxtImg
// For local avatars, use the API route directly
// For external URLs, use as-is (NuxtImg will proxy through IPX)
const optimizedSrc = computed(() => {
  if (!avatarSrc.value) return null

  // If it's our local avatar API, use it directly
  if (isLocalAvatar.value) {
    return avatarSrc.value
  }

  // For external URLs, return as-is (NuxtImg handles it)
  return avatarSrc.value
})
</script>

<template>
  <div class="relative inline-block">
    <!-- Avatar with image (using NuxtImg for optimization) -->
    <div
      v-if="optimizedSrc"
      class="overflow-hidden rounded-none squircle bg-slate-200 dark:bg-slate-700"
      :style="{ width: `${config.container}px`, height: `${config.container}px` }"
    >
      <NuxtImg
        :src="optimizedSrc"
        :width="config.image"
        :height="config.image"
        format="webp"
        :alt="user?.name || user?.username || 'User'"
        class="w-full h-full object-cover"
        loading="lazy"
      />
    </div>

    <!-- Avatar with initials fallback -->
    <div
      v-else-if="initials"
      class="rounded-none squircle bg-slate-200 dark:bg-slate-700 flex justify-center items-center font-bold text-slate-600 dark:text-slate-300"
      :style="{ width: `${config.container}px`, height: `${config.container}px` }"
      :class="{
        'text-sm': size === 'sm',
        'text-base': size === 'md',
        'text-xl': size === 'lg',
        'text-2xl': size === 'xl'
      }"
    >
      {{ initials }}
    </div>

    <!-- Avatar with icon fallback -->
    <div
      v-else
      class="rounded-none squircle bg-slate-200 dark:bg-slate-700 flex justify-center items-center"
      :style="{ width: `${config.container}px`, height: `${config.container}px` }"
    >
      <UIcon
        name="i-heroicons-user-20-solid"
        :class="{
          'size-4': size === 'sm',
          'size-5': size === 'md',
          'size-7': size === 'lg',
          'size-10': size === 'xl'
        }"
        class="text-slate-600 dark:text-slate-300"
      />
    </div>
  </div>
</template>
