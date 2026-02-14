<script setup lang="ts">
const { t } = useI18n()
const { getMfaStatus } = useUserProfile()

const mfaStatus = ref<{ enabled: boolean, factors: string[] }>({ enabled: false, factors: [] })
const isSetupModalOpen = ref(false)
const isDisableModalOpen = ref(false)

const is2FAEnabled = computed(() => mfaStatus.value.enabled)

// Fetch MFA status on mount
onMounted(async () => {
  mfaStatus.value = await getMfaStatus()
})

function handleEnableSuccess() {
  mfaStatus.value = { enabled: true, factors: ['Totp'] }
}

function handleDisableSuccess() {
  mfaStatus.value = { enabled: false, factors: [] }
}
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
    <!-- Section Header -->
    <div class="p-4 sm:p-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center size-9 rounded-lg bg-success-500/10 dark:bg-success-500/20">
            <UIcon name="i-lucide-shield-check" class="size-5 text-success-600 dark:text-success-400" />
          </div>
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">
              {{ t('profile.twoFactorAuth') }}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ is2FAEnabled ? t('profile.2FASecured') : t('profile.2FANotEnabled') }}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end sm:justify-start gap-2">
          <UBadge
            :color="is2FAEnabled ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ is2FAEnabled ? t('profile.enabled') : t('profile.disabled') }}
          </UBadge>

          <UButton
            v-if="!is2FAEnabled"
            size="sm"
            @click="isSetupModalOpen = true"
          >
            {{ t('profile.enable') }}
          </UButton>
          <UButton
            v-else
            color="error"
            variant="ghost"
            size="sm"
            @click="isDisableModalOpen = true"
          >
            {{ t('profile.disable') }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <ProfileTwoFactorSetupModal
      v-model:open="isSetupModalOpen"
      @success="handleEnableSuccess"
    />
    <ProfileTwoFactorDisableModal
      v-model:open="isDisableModalOpen"
      @success="handleDisableSuccess"
    />
  </div>
</template>
