<script setup lang="ts">
const { t } = useI18n()
const { disableTotp, loading } = useUserProfile()
const passwordVisibility = usePasswordVisibility()
const toast = useToast()

const isOpen = defineModel<boolean>('open', { default: false })
const password = ref('')

const emit = defineEmits<{
  success: []
}>()

async function handleConfirm() {
  if (!password.value) return

  try {
    await disableTotp(password.value)
    toast.add({ title: t('profile.toasts.twoFactorDisabled'), color: 'success' })
    isOpen.value = false
    resetState()
    emit('success')
  } catch {
    toast.add({ title: t('profile.errors.incorrectCurrentPassword'), color: 'error' })
  }
}

function resetState() {
  password.value = ''
  passwordVisibility.hide()
}

function handleClose() {
  isOpen.value = false
  resetState()
}

// Reset state when modal closes
watch(isOpen, (open) => {
  if (!open) {
    resetState()
  }
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="t('profile.modals.disableTwoFactor.title')"
  >
    <template #content>
      <div class="p-6 space-y-4">
        <p class="text-sm text-gray-600 text-center">
          {{ t('profile.modals.disableTwoFactor.description') }}
        </p>
        <UFormField :label="t('profile.currentPassword')">
          <UInput
            v-model="password"
            :type="passwordVisibility.type.value"
            placeholder="••••••••"
            autofocus
            icon="i-lucide-lock"
            :ui="{ trailing: 'pe-1' }"
            class="w-full"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                :icon="passwordVisibility.icon.value"
                :aria-label="passwordVisibility.ariaLabel.value"
                :aria-pressed="passwordVisibility.visible.value"
                @click="passwordVisibility.toggle"
              />
            </template>
          </UInput>
        </UFormField>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            block
            @click="handleClose"
          >
            {{ t('profile.cancel') }}
          </UButton>
          <UButton
            color="error"
            block
            :disabled="!password"
            :loading="loading"
            @click="handleConfirm"
          >
            {{ t('profile.modals.disableTwoFactor.disable2FA') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
