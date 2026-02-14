<script setup lang="ts">
const { t } = useI18n()
const { deleteAccount, loading } = useUserProfile()
const passwordVisibility = usePasswordVisibility()

const isOpen = defineModel<boolean>('open', { default: false })
const password = ref('')

const emit = defineEmits<{
  success: []
}>()

async function handleConfirm() {
  if (!password.value) return

  try {
    await deleteAccount(password.value)
    useToast().add({ title: t('profile.toasts.accountDeleted'), color: 'success' })
    isOpen.value = false
    emit('success')
    // Redirect to sign-out with full page reload (server-side navigation)
    window.location.href = '/sign-out'
  } catch {
    useToast().add({ title: t('profile.errors.incorrectCurrentPassword'), color: 'error' })
  }
}

function handleClose() {
  isOpen.value = false
  password.value = ''
  passwordVisibility.hide()
}

// Reset state when modal closes
watch(isOpen, (open) => {
  if (!open) {
    password.value = ''
    passwordVisibility.hide()
  }
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="t('profile.modals.deleteAccount.title')"
  >
    <template #content>
      <div class="p-6 space-y-4">
        <div class="text-center space-y-2">
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="text-red-500 size-12"
          />
          <p class="text-sm text-gray-600">
            {{ t('profile.modals.deleteAccount.description') }}
          </p>
          <p class="text-xs text-red-500 font-medium">
            {{ t('profile.modals.deleteAccount.warning') }}
          </p>
        </div>
        <UFormField :label="t('profile.currentPassword')">
          <UInput
            v-model="password"
            :type="passwordVisibility.type.value"
            placeholder="••••••••"
            name="delete-account-password"
            autofocus
            icon="i-lucide-lock"
            :ui="{ trailing: 'pe-1' }"
            class="w-full"
            @keydown.enter.prevent="handleConfirm"
          >
            <template #trailing>
              <UButton
                type="button"
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
            type="button"
            color="neutral"
            variant="ghost"
            block
            @click="handleClose"
          >
            {{ t('profile.cancel') }}
          </UButton>
          <UButton
            type="button"
            color="error"
            block
            :disabled="!password"
            :loading="loading"
            @click="handleConfirm"
          >
            {{ t('profile.modals.deleteAccount.confirm') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
