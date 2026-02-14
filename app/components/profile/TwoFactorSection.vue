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
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
        <div>
          <h3 class="text-lg font-semibold">
            {{ t('profile.twoFactorAuth') }}
          </h3>
          <p class="text-sm text-gray-500">
            {{ t('profile.twoFactorDescription') }}
          </p>
        </div>
        <UBadge
          :color="is2FAEnabled ? 'success' : 'neutral'"
          variant="subtle"
        >
          {{ is2FAEnabled ? t('profile.enabled') : t('profile.notVerified') }}
        </UBadge>
      </div>
    </template>

    <div class="flex justify-between items-center">
      <div class="text-sm">
        <p v-if="is2FAEnabled">
          {{ t('profile.2FASecured') }}
        </p>
        <p v-else>
          {{ t('profile.2FANotEnabled') }}
        </p>
      </div>
      <UButton
        v-if="!is2FAEnabled"
        icon="i-heroicons-shield-check"
        @click="isSetupModalOpen = true"
      >
        {{ t('profile.enable') }}
      </UButton>
      <UButton
        v-else
        color="error"
        variant="ghost"
        icon="i-heroicons-trash"
        @click="isDisableModalOpen = true"
      >
        {{ t('profile.disable') }}
      </UButton>
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
  </UCard>
</template>
