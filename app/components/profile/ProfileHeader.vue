<script setup lang="ts">
const { session } = useAuthSession()
const { t } = useI18n()

const user = computed(() => session.value?.user)
</script>

<template>
  <div class="relative overflow-hidden rounded-xl bg-linear-to-r from-primary-500/5 to-primary-400/10 dark:from-primary-500/10 dark:to-primary-400/5 border border-primary-500/10">
    <div class="relative px-4 py-5 sm:px-6 sm:py-6">
      <div class="flex items-center gap-4 sm:gap-5">
        <!-- Avatar with upload capability -->
        <div class="relative shrink-0">
          <ProfileAvatarUploader />
        </div>

        <!-- User info -->
        <div class="flex-1 min-w-0">
          <h1 class="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
            {{ user?.name || t('profile.title') }}
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1.5">
            <UIcon
              name="i-lucide-mail"
              class="size-3.5 shrink-0"
            />
            {{ user?.email }}
          </p>
          <div class="mt-2 flex flex-wrap items-center gap-1.5">
            <UBadge
              color="success"
              variant="subtle"
              size="xs"
            >
              <UIcon
                name="i-lucide-check"
                class="size-3 mr-1"
              />
              {{ t('profile.verified') }}
            </UBadge>
            <UBadge
              v-if="user?.username"
              color="neutral"
              variant="subtle"
              size="xs"
            >
              @{{ user.username }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
