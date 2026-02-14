<script setup lang="ts">
const { t } = useI18n()

const isDeleteModalOpen = ref(false)
</script>

<template>
  <div class="space-y-4">
    <!-- Section Header -->
    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
      {{ t('profile.dangerZone.title') }}
    </h2>

    <!-- Danger Card -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-error-200 dark:border-error-900/50 overflow-hidden">
      <div class="p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center size-9 rounded-lg bg-error-500/10 dark:bg-error-500/20 shrink-0">
              <UIcon
                name="i-lucide-trash-2"
                class="size-5 text-error-500"
              />
            </div>
            <div>
              <h3 class="font-medium text-gray-900 dark:text-white">
                {{ t('profile.dangerZone.deleteAccount') }}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{ t('profile.dangerZone.deleteAccountDesc') }}
              </p>
            </div>
          </div>

          <UButton
            color="error"
            variant="outline"
            size="sm"
            class="shrink-0 self-end sm:self-auto"
            @click="isDeleteModalOpen = true"
          >
            <UIcon
              name="i-lucide-trash-2"
              class="size-4 mr-1.5"
            />
            {{ t('profile.dangerZone.deleteAccount') }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <ProfileDeleteAccountModal v-model:open="isDeleteModalOpen" />
  </div>
</template>
