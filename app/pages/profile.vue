<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import VueQrcode from '@chenfengyuan/vue-qrcode'

definePageMeta({
  middleware: 'auth',
  requiresAuth: true
})

const { t } = useI18n()
const { session } = useAuthSession()
const { updateProfile, changePassword, setupTotp, verifyTotp, disableTotp, getMfaStatus, deleteAccount, loading, error: _error } = useUserProfile()
const toast = useToast()
const clientLogger = useClientLogger()

// Tabs
const items = [{
  slot: 'profile',
  label: t('profile.profileInfo')
}, {
  slot: 'security',
  label: t('profile.security')
}]

// Profile Form
const profileFormState = reactive<{
  name: string
  username: string
  email: string
  phone: string
  address: string
}>({
  name: session.value?.user?.name || '',
  username: session.value?.user?.username || '',
  email: session.value?.user?.email || '',
  phone: (session.value?.user?.phoneNumber as string) || '',
  address: (session.value?.user?.custom_data?.address as string) || ''
})

const schemaProfile = computed(() => z.object({
  name: z.string().min(1, t('validation.nameRequired')),
  username: z.string().optional(),
  email: z.string().email(t('validation.emailInvalid')),
  phone: z.string().optional(),
  address: z.string().optional()
}))

type ProfileSchema = z.output<typeof schemaProfile.value>

async function onProfileSubmit(event: FormSubmitEvent<ProfileSchema>) {
  try {
    await updateProfile({
      name: event.data.name,
      username: event.data.username,
      customData: {
        address: event.data.address
      }
    })
    toast.add({ title: t('profile.toasts.profileUpdated'), color: 'success' })
  } catch {
    toast.add({ title: t('profile.errors.updateProfile'), color: 'error' })
  }
}

// Password Form
const passwordState = reactive({
  currentPassword: '',
  password: ''
})

// Password visibility toggles
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)

// Password strength indicator
function checkStrength(str: string) {
  const requirements = [
    { regex: /.{8,}/, text: t('profile.passwordStrength.minLength') },
    { regex: /\d/, text: t('profile.passwordStrength.number') },
    { regex: /[a-z]/, text: t('profile.passwordStrength.lowercase') },
    { regex: /[A-Z]/, text: t('profile.passwordStrength.uppercase') }
  ]
  return requirements.map(req => ({
    met: req.regex.test(str),
    text: req.text
  }))
}

const strength = computed(() => checkStrength(passwordState.password))
const strengthScore = computed(() => strength.value.filter(req => req.met).length)
const strengthColor = computed(() => {
  if (strengthScore.value === 0) return 'neutral' as const
  if (strengthScore.value <= 1) return 'error' as const
  if (strengthScore.value <= 2) return 'warning' as const
  if (strengthScore.value === 3) return 'warning' as const
  return 'success' as const
})
const strengthText = computed(() => {
  if (strengthScore.value === 0) return t('profile.passwordStrength.enter')
  if (strengthScore.value <= 2) return t('profile.passwordStrength.weak')
  if (strengthScore.value === 3) return t('profile.passwordStrength.medium')
  return t('profile.passwordStrength.strong')
})

const schemaPassword = computed(() => z.object({
  currentPassword: z.string().min(1, t('validation.currentPasswordRequired')),
  password: z.string().min(8, t('validation.passwordMinLength'))
}))

type PasswordSchema = z.output<typeof schemaPassword.value>

interface PasswordErrorData {
  errorType?: 'verification' | 'password_update'
  code?: string
  subCodes?: string[]
}

interface ServerError {
  data?: { data?: PasswordErrorData }
}

async function onPasswordSubmit(event: FormSubmitEvent<PasswordSchema>) {
  try {
    await changePassword(event.data.password, event.data.currentPassword)
    toast.add({ title: t('profile.toasts.passwordChanged'), color: 'success' })
    passwordState.currentPassword = ''
    passwordState.password = ''
  } catch (e: unknown) {
    clientLogger.error('profile', 'Password change failed', e)
    const serverError = e as ServerError
    const errorData = serverError?.data?.data // server createError puts our data here
    const { title, description } = resolvePasswordError(errorData)
    toast.add({ title, description, color: 'error' })
  }
}

/**
 * Resolve a password change error into specific i18n title + description.
 * The server sends { errorType, code, subCodes } where:
 * - errorType: 'verification' (wrong current password) or 'password_update' (policy failure)
 * - code: normalized Logto code (dots → __)
 * - subCodes: array of normalized specific rejection reasons
 */
function resolvePasswordError(errorData?: PasswordErrorData): { title: string, description: string } {
  if (!errorData) {
    return {
      title: t('profile.errors.changePassword'),
      description: t('profile.errors.serverError')
    }
  }

  const { errorType, code, subCodes } = errorData

  // Wrong current password
  if (errorType === 'verification') {
    return {
      title: t('profile.errors.changePassword'),
      description: tryLogtoKey(code) || t('profile.errors.incorrectCurrentPassword')
    }
  }

  // Password policy rejection — try subCodes first (most specific)
  if (errorType === 'password_update') {
    if (Array.isArray(subCodes) && subCodes.length > 0) {
      const messages = subCodes
        .filter((sc): sc is string => typeof sc === 'string')
        .map(sc => tryLogtoKey(sc))
        .filter(Boolean)
      if (messages.length > 0) {
        return {
          title: t('profile.errors.changePassword'),
          description: messages.join(' ')
        }
      }
    }
    // Fall back to main code
    if (code) {
      const msg = tryLogtoKey(code)
      if (msg) {
        return {
          title: t('profile.errors.changePassword'),
          description: msg
        }
      }
    }
  }

  // Generic fallback
  return {
    title: t('profile.errors.changePassword'),
    description: t('profile.errors.logto.unknown')
  }
}

/** Try to find a translated message for a normalized Logto error code */
function tryLogtoKey(code: string | undefined): string | null {
  if (!code) return null
  const key = `profile.errors.logto.${code}`
  const translated = t(key)
  return translated !== key ? translated : null
}

// 2FA - Fetch status from server (queries Logto directly)
const mfaStatus = ref<{ enabled: boolean, factors: string[] }>({ enabled: false, factors: [] })

// Fetch MFA status on mount
onMounted(async () => {
  mfaStatus.value = await getMfaStatus()
})

const is2FAEnabled = computed(() => mfaStatus.value.enabled)

const is2FAModalOpen = ref(false)
const isDisable2FAModalOpen = ref(false)
const disable2FAPassword = ref('')
const showDisable2FAPassword = ref(false)
const showTotpPassword = ref(false)
const totpStep = ref<'start' | 'scan' | 'verify' | 'password'>('start')
const totpData = ref<{ secret: string, qrCodeUri: string, verificationId?: string } | null>(null)
const totpCode = ref<string[]>([])
const totpPassword = ref('')

async function start2FAFlow() {
  totpStep.value = 'start'
  totpPassword.value = ''
  totpCode.value = []
  showTotpPassword.value = false
  is2FAModalOpen.value = true
  // Retrieve secret
  try {
    const res = await setupTotp()
    totpData.value = res
    totpStep.value = 'scan'
  } catch {
    toast.add({ title: 'Failed to start 2FA setup', color: 'error' })
    is2FAModalOpen.value = false
  }
}

async function verify2FASetup() {
  try {
    if (!totpData.value?.secret) throw new Error('No TOTP secret')

    // If no verificationId, we need password to get one
    if (!totpData.value.verificationId && !totpPassword.value) {
      totpStep.value = 'password'
      return
    }

    const code = totpCode.value.join('')
    await verifyTotp(code, totpData.value.secret, totpData.value.verificationId, totpPassword.value || undefined)
    toast.add({ title: t('profile.toasts.twoFactorEnabled'), color: 'success' })
    is2FAModalOpen.value = false
    totpCode.value = []
    totpPassword.value = ''

    // Refresh the page to update the session and show 2FA as enabled
    // The session needs to be refreshed from the server to get updated MFA claims
    await nextTick()
    window.location.reload()
  } catch (e: unknown) {
    const errorObj = e as { data?: { data?: { code?: string } } }
    const errorData = errorObj?.data?.data
    if (errorData?.code === 'verification_required') {
      // Server needs password verification
      totpStep.value = 'password'
    } else {
      toast.add({ title: t('profile.errors.verificationFailed'), color: 'error' })
    }
  }
}

async function disable2FA() {
  // Show the disable modal instead of using confirm()
  disable2FAPassword.value = ''
  showDisable2FAPassword.value = false
  isDisable2FAModalOpen.value = true
}

async function confirmDisable2FA() {
  if (!disable2FAPassword.value) return

  try {
    await disableTotp(disable2FAPassword.value)
    toast.add({ title: t('profile.toasts.twoFactorDisabled'), color: 'success' })
    isDisable2FAModalOpen.value = false
    disable2FAPassword.value = ''
    // Refresh to update the MFA status
    window.location.reload()
  } catch {
    toast.add({ title: t('profile.errors.incorrectCurrentPassword'), color: 'error' })
  }
}

// Delete Account
const isDeleteAccountModalOpen = ref(false)
const deleteAccountPassword = ref('')
const showDeleteAccountPassword = ref(false)

async function confirmDeleteAccount() {
  if (!deleteAccountPassword.value) return

  try {
    await deleteAccount(deleteAccountPassword.value)
    toast.add({ title: t('profile.toasts.accountDeleted'), color: 'success' })
    isDeleteAccountModalOpen.value = false
    // Redirect to sign-out with full page reload (server-side navigation)
    window.location.href = '/sign-out'
  } catch {
    toast.add({ title: t('profile.errors.incorrectCurrentPassword'), color: 'error' })
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6">
      <h1 class="text-3xl font-bold">
        {{ t('profile.title') }}
      </h1>
      <p class="text-gray-500">
        {{ t('profile.subtitle') }}
      </p>
    </div>

    <UTabs
      :items="items"
      class="w-full"
    >
      <template #profile>
        <UCard class="mt-4">
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ t('profile.profileInfo') }}
            </h3>
          </template>

          <UForm
            :schema="schemaProfile"
            :state="profileFormState"
            class="space-y-4"
            @submit="onProfileSubmit"
          >
            <UFormField
              :label="t('profile.email')"
              name="email"
            >
              <UInput
                v-model="profileFormState.email"
                disabled
                icon="i-heroicons-envelope"
                class="w-full"
              />
              <p class="text-xs text-gray-500 mt-1">
                {{ t('profile.emailNotChangeable') }}
              </p>
            </UFormField>

            <UFormField
              :label="t('profile.username')"
              name="username"
            >
              <UInput
                v-model="profileFormState.username"
                icon="i-heroicons-user"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="t('common.user')"
              name="name"
            >
              <UInput
                v-model="profileFormState.name"
                icon="i-heroicons-identification"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Phone"
              name="phone"
            >
              <UInput
                v-model="profileFormState.phone"
                icon="i-heroicons-phone"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="t('profile.address')"
              name="address"
            >
              <UInput
                v-model="profileFormState.address"
                icon="i-heroicons-map-pin"
                class="w-full"
              />
            </UFormField>

            <div class="flex justify-end">
              <UButton
                type="submit"
                :loading="loading"
              >
                {{ t('profile.saveChanges') }}
              </UButton>
            </div>
          </UForm>
        </UCard>
      </template>

      <template #security>
        <div class="space-y-6 mt-4">
          <!-- Password Section -->
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">
                {{ t('profile.changePassword') }}
              </h3>
              <p class="text-sm text-gray-500">
                {{ t('profile.passwordDescription') }}
              </p>
            </template>

            <UForm
              :schema="schemaPassword"
              :state="passwordState"
              class="space-y-4"
              @submit="onPasswordSubmit"
            >
              <UFormField
                :label="t('profile.currentPassword')"
                name="currentPassword"
              >
                <UInput
                  v-model="passwordState.currentPassword"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  icon="i-lucide-lock"
                  :ui="{ trailing: 'pe-1' }"
                  class="w-full"
                >
                  <template #trailing>
                    <UButton
                      color="neutral"
                      variant="link"
                      size="sm"
                      :icon="showCurrentPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                      :aria-label="showCurrentPassword ? 'Hide password' : 'Show password'"
                      :aria-pressed="showCurrentPassword"
                      @click="showCurrentPassword = !showCurrentPassword"
                    />
                  </template>
                </UInput>
              </UFormField>

              <UFormField
                :label="t('profile.newPassword')"
                name="password"
              >
                <div class="space-y-2 w-full">
                  <UInput
                    v-model="passwordState.password"
                    :type="showNewPassword ? 'text' : 'password'"
                    :color="strengthColor"
                    icon="i-lucide-lock"
                    :aria-invalid="strengthScore < 4"
                    aria-describedby="password-strength"
                    :ui="{ trailing: 'pe-1' }"
                    class="w-full"
                  >
                    <template #trailing>
                      <UButton
                        color="neutral"
                        variant="link"
                        size="sm"
                        :icon="showNewPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                        :aria-label="showNewPassword ? 'Hide password' : 'Show password'"
                        :aria-pressed="showNewPassword"
                        @click="showNewPassword = !showNewPassword"
                      />
                    </template>
                  </UInput>

                  <UProgress
                    :color="strengthColor"
                    :indicator="strengthText"
                    :model-value="strengthScore"
                    :max="4"
                    size="sm"
                  />

                  <p
                    id="password-strength"
                    class="text-sm font-medium"
                  >
                    {{ strengthText }}. {{ t('profile.passwordStrength.mustContain') }}
                  </p>
                  <ul
                    class="space-y-1"
                    aria-label="Password requirements"
                  >
                    <li
                      v-for="(req, index) in strength"
                      :key="index"
                      class="flex items-center gap-1"
                      :class="req.met ? 'text-success' : 'text-muted'"
                    >
                      <UIcon
                        :name="req.met ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
                        class="size-4 shrink-0"
                      />
                      <span class="text-xs font-light">
                        {{ req.text }}
                        <span class="sr-only">
                          {{ req.met ? t('profile.passwordStrength.met') : t('profile.passwordStrength.notMet') }}
                        </span>
                      </span>
                    </li>
                  </ul>
                </div>
              </UFormField>

              <div class="flex justify-end">
                <UButton
                  type="submit"
                  :loading="loading"
                >
                  {{ t('profile.updatePassword') }}
                </UButton>
              </div>
            </UForm>
          </UCard>

          <!-- 2FA Section -->
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
                @click="start2FAFlow"
              >
                {{ t('profile.enable') }}
              </UButton>
              <UButton
                v-else
                color="error"
                variant="ghost"
                icon="i-heroicons-trash"
                @click="disable2FA"
              >
                {{ t('profile.disable') }}
              </UButton>
            </div>
          </UCard>

          <!-- Danger Zone -->
          <UCard>
            <template #header>
              <div>
                <h3 class="text-lg font-semibold text-red-500">
                  {{ t('profile.dangerZone.title') }}
                </h3>
                <p class="text-sm text-gray-500">
                  {{ t('profile.dangerZone.description') }}
                </p>
              </div>
            </template>

            <div class="flex justify-between items-center">
              <div class="text-sm">
                <p>{{ t('profile.dangerZone.deleteAccountDesc') }}</p>
              </div>
              <UButton
                color="error"
                variant="outline"
                icon="i-heroicons-trash"
                @click="isDeleteAccountModalOpen = true"
              >
                {{ t('profile.dangerZone.deleteAccount') }}
              </UButton>
            </div>
          </UCard>
        </div>
      </template>
    </UTabs>

    <!-- 2FA Setup Modal -->
    <UModal
      v-model:open="is2FAModalOpen"
      :title="totpStep === 'password' ? t('profile.modals.twoFactor.passwordRequired') : t('profile.modals.twoFactor.scanQrTitle')"
    >
      <template #content>
        <div class="p-6 space-y-4">
          <!-- Password Step - Required when verificationId is missing -->
          <div
            v-if="totpStep === 'password'"
            class="space-y-4"
          >
            <p class="text-sm text-gray-600 text-center">
              {{ t('profile.modals.twoFactor.passwordDesc') }}
            </p>
            <UFormField :label="t('profile.currentPassword')">
              <UInput
                v-model="totpPassword"
                :type="showTotpPassword ? 'text' : 'password'"
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
                    :icon="showTotpPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    :aria-label="showTotpPassword ? 'Hide password' : 'Show password'"
                    :aria-pressed="showTotpPassword"
                    @click="showTotpPassword = !showTotpPassword"
                  />
                </template>
              </UInput>
            </UFormField>
            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                block
                @click="totpStep = 'scan'"
              >
                {{ t('profile.cancel') }}
              </UButton>
              <UButton
                block
                :disabled="!totpPassword"
                :loading="loading"
                @click="verify2FASetup"
              >
                {{ t('profile.modals.twoFactor.verifyAndActivate') }}
              </UButton>
            </div>
          </div>

          <!-- Scan QR Step -->
          <div
            v-else-if="totpStep === 'scan'"
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
                  @complete="verify2FASetup"
                />
              </div>
            </div>

            <UButton
              block
              :disabled="totpCode.length < 6"
              :loading="loading"
              @click="verify2FASetup"
            >
              {{ t('profile.modals.twoFactor.verifyAndActivate') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Disable 2FA Modal -->
    <UModal
      v-model:open="isDisable2FAModalOpen"
      :title="t('profile.modals.disableTwoFactor.title')"
    >
      <template #content>
        <div class="p-6 space-y-4">
          <p class="text-sm text-gray-600 text-center">
            {{ t('profile.modals.disableTwoFactor.description') }}
          </p>
          <UFormField :label="t('profile.currentPassword')">
            <UInput
              v-model="disable2FAPassword"
              :type="showDisable2FAPassword ? 'text' : 'password'"
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
                  :icon="showDisable2FAPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="showDisable2FAPassword ? 'Hide password' : 'Show password'"
                  :aria-pressed="showDisable2FAPassword"
                  @click="showDisable2FAPassword = !showDisable2FAPassword"
                />
              </template>
            </UInput>
          </UFormField>
          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              block
              @click="isDisable2FAModalOpen = false"
            >
              {{ t('profile.cancel') }}
            </UButton>
            <UButton
              color="error"
              block
              :disabled="!disable2FAPassword"
              :loading="loading"
              @click="confirmDisable2FA"
            >
              {{ t('profile.modals.disableTwoFactor.disable2FA') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Account Modal -->
    <UModal
      v-model:open="isDeleteAccountModalOpen"
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
              v-model="deleteAccountPassword"
              :type="showDeleteAccountPassword ? 'text' : 'password'"
              placeholder="••••••••"
              name="delete-account-password"
              autofocus
              icon="i-lucide-lock"
              :ui="{ trailing: 'pe-1' }"
              class="w-full"
              @keydown.enter.prevent="confirmDeleteAccount"
            >
              <template #trailing>
                <UButton
                  type="button"
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="showDeleteAccountPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="showDeleteAccountPassword ? 'Hide password' : 'Show password'"
                  :aria-pressed="showDeleteAccountPassword"
                  @click="showDeleteAccountPassword = !showDeleteAccountPassword"
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
              @click="isDeleteAccountModalOpen = false"
            >
              {{ t('profile.cancel') }}
            </UButton>
            <UButton
              type="button"
              color="error"
              block
              :disabled="!deleteAccountPassword"
              :loading="loading"
              @click="confirmDeleteAccount"
            >
              {{ t('profile.modals.deleteAccount.confirm') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
