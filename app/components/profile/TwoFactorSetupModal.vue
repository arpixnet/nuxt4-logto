<script setup lang="ts">
import VueQrcode from '@chenfengyuan/vue-qrcode'

const { t } = useI18n()
const { setupTotp, verifyTotp, loading } = useUserProfile()
const toast = useToast()

const isOpen = defineModel<boolean>('open', { default: false })
const passwordVisibility = usePasswordVisibility()

const emit = defineEmits<{
  success: []
}>()

type Step = 'start' | 'scan' | 'verify' | 'password'
const step = ref<Step>('start')
const totpData = ref<{ secret: string, qrCodeUri: string, verificationId?: string } | null>(null)
const totpCode = ref<string[]>([])
const totpPassword = ref('')

async function startFlow() {
  step.value = 'start'
  totpPassword.value = ''
  totpCode.value = []
  passwordVisibility.hide()

  try {
    const res = await setupTotp()
    totpData.value = res
    step.value = 'scan'
  } catch {
    toast.add({ title: 'Failed to start 2FA setup', color: 'error' })
    isOpen.value = false
  }
}

async function verifySetup() {
  try {
    if (!totpData.value?.secret) throw new Error('No TOTP secret')

    // If no verificationId, we need password to get one
    if (!totpData.value.verificationId && !totpPassword.value) {
      step.value = 'password'
      return
    }

    const code = totpCode.value.join('')
    await verifyTotp(code, totpData.value.secret, totpData.value.verificationId, totpPassword.value || undefined)
    toast.add({ title: t('profile.toasts.twoFactorEnabled'), color: 'success' })

    // Reset and close
    isOpen.value = false
    resetState()
    emit('success')
  } catch (e: unknown) {
    const errorObj = e as { data?: { data?: { code?: string } } }
    const errorData = errorObj?.data?.data
    if (errorData?.code === 'verification_required') {
      // Server needs password verification
      step.value = 'password'
    } else {
      toast.add({ title: t('profile.errors.verificationFailed'), color: 'error' })
    }
  }
}

function resetState() {
  totpCode.value = []
  totpPassword.value = ''
  step.value = 'start'
  totpData.value = null
  passwordVisibility.hide()
}

// Start flow when modal opens
watch(isOpen, (open) => {
  if (open) {
    startFlow()
  } else {
    resetState()
  }
})

const modalTitle = computed(() =>
  step.value === 'password'
    ? t('profile.modals.twoFactor.passwordRequired')
    : t('profile.modals.twoFactor.scanQrTitle')
)
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="modalTitle"
  >
    <template #content>
      <div class="p-6 space-y-4">
        <!-- Password Step - Required when verificationId is missing -->
        <div
          v-if="step === 'password'"
          class="space-y-4"
        >
          <p class="text-sm text-gray-600 text-center">
            {{ t('profile.modals.twoFactor.passwordDesc') }}
          </p>
          <UFormField :label="t('profile.currentPassword')">
            <UInput
              v-model="totpPassword"
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
              @click="step = 'scan'"
            >
              {{ t('profile.cancel') }}
            </UButton>
            <UButton
              block
              :disabled="!totpPassword"
              :loading="loading"
              @click="verifySetup"
            >
              {{ t('profile.modals.twoFactor.verifyAndActivate') }}
            </UButton>
          </div>
        </div>

        <!-- Scan QR Step -->
        <div
          v-else-if="step === 'scan'"
          class="space-y-4"
        >
          <p class="text-sm text-gray-600 text-center">
            {{ t('profile.modals.twoFactor.scanQrDesc') }}
          </p>
          <!-- QR Code display - Only show what Logto provides -->
          <div
            v-if="totpData?.qrCodeUri"
            class="flex justify-center"
          >
            <div class="p-4 bg-white rounded">
              <!-- If qrCodeUri is a data URI, render it directly as image -->
              <img
                v-if="totpData.qrCodeUri.startsWith('data:')"
                :src="totpData.qrCodeUri"
                alt="QR Code"
                class="max-w-50"
              >
              <!-- Otherwise, generate QR code from the otpauth:// URI -->
              <VueQrcode
                v-else
                :value="totpData.qrCodeUri"
                :options="{ width: 200 }"
                tag="canvas"
              />
            </div>
          </div>
          <!-- Show secret for manual entry -->
          <div
            v-if="totpData?.secret"
            class="text-xs text-gray-500 text-center"
          >
            {{ t('profile.modals.twoFactor.manualEntry') }} <span class="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">{{ totpData.secret }}</span>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium text-center">
              {{ t('profile.modals.twoFactor.enterCode') }}
            </p>
            <div class="flex justify-center">
              <UPinInput
                v-model="totpCode"
                :length="6"
                otp
                autofocus
                size="lg"
                @complete="verifySetup"
              />
            </div>
          </div>

          <UButton
            block
            :disabled="totpCode.length < 6"
            :loading="loading"
            @click="verifySetup"
          >
            {{ t('profile.modals.twoFactor.verifyAndActivate') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
