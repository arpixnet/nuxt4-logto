<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  middleware: 'auth',
  requiresAuth: true
})

const { t } = useI18n()
const { session } = useAuthSession()
const { updateProfile, changePassword, setupTotp, verifyTotp, disableTotp, loading, error } = useUserProfile()
const toast = useToast()

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
}>({
  name: session.value?.user?.name || '',
  username: session.value?.user?.username || '',
  email: session.value?.user?.email || '',
  phone: (session.value?.user?.phoneNumber as string) || ''
})

const schemaProfile = computed(() => z.object({
  name: z.string().min(1, t('validation.nameRequired')),
  username: z.string().optional(),
  email: z.string().email(t('validation.emailInvalid')),
  phone: z.string().optional()
}))

async function onProfileSubmit(event: FormSubmitEvent<any>) {
  try {
    await updateProfile({
      name: event.data.name,
      username: event.data.username,
    })
    toast.add({ title: t('profile.toasts.profileUpdated'), color: 'success' })
  } catch (e) {
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

async function onPasswordSubmit(event: FormSubmitEvent<any>) {
  try {
    await changePassword(event.data.password, event.data.currentPassword)
    toast.add({ title: t('profile.toasts.passwordChanged'), color: 'success' })
    passwordState.currentPassword = ''
    passwordState.password = ''
  } catch (e: any) {
    console.error(e)
    const errorData = e?.data?.data // server createError puts our data here
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
function resolvePasswordError(errorData: any): { title: string; description: string } {
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
        .map((sc: string) => tryLogtoKey(sc))
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
function tryLogtoKey(code: string): string | null {
  if (!code) return null
  const key = `profile.errors.logto.${code}`
  const translated = t(key)
  return translated !== key ? translated : null
}

// 2FA
const is2FAEnabled = computed(() => {
  // Check session for mfa_verification_factors or similar claims
  // Or we need to fetch it. For now, we assume if mfa enabled user has 'mfa' claim or similar.
  // Logto userinfo might have `mfa_verification_factors`.
  // Casting to any to check properties not in standard type
  const user = session.value?.user as any
  return user?.mfa_verification_factors?.length > 0
})

const is2FAModalOpen = ref(false)
const totpStep = ref<'start' | 'scan' | 'verify'>('start')
const totpData = ref<{ secret: string, qrCodeUri: string } | null>(null)
const totpCode = ref('')

async function start2FAFlow() {
  totpStep.value = 'start'
  is2FAModalOpen.value = true
  // Retrieve secret
  try {
     const res = await setupTotp()
     totpData.value = res
     totpStep.value = 'scan'
  } catch (e) {
     toast.add({ title: 'Failed to start 2FA setup', color: 'error' })
     is2FAModalOpen.value = false
  }
}

async function verify2FASetup() {
  try {
    await verifyTotp(totpCode.value)
    toast.add({ title: t('profile.toasts.twoFactorEnabled'), color: 'success' })
    is2FAModalOpen.value = false
    totpCode.value = ''
  } catch (e) {
    toast.add({ title: t('profile.errors.verificationFailed'), color: 'error' })
  }
}

async function disable2FA() {
    if (!confirm(t('profile.modals.disableTwoFactor.description'))) return
    try {
        await disableTotp()
        toast.add({ title: t('profile.toasts.twoFactorDisabled'), color: 'success' })
    } catch (e) {
         toast.add({ title: t('profile.errors.disable2FA'), color: 'error' })
    }
}

</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6">
      <h1 class="text-3xl font-bold">{{ t('profile.title') }}</h1>
      <p class="text-gray-500">{{ t('profile.subtitle') }}</p>
    </div>

    <UTabs :items="items" class="w-full">
      <template #profile="{ item }">
        <UCard class="mt-4">
          <template #header>
            <h3 class="text-lg font-semibold">{{ t('profile.profileInfo') }}</h3>
          </template>

          <UForm :schema="schemaProfile" :state="profileFormState" class="space-y-4" @submit="onProfileSubmit">
            <UFormField :label="t('profile.email')" name="email">
              <UInput v-model="profileFormState.email" disabled icon="i-heroicons-envelope" class="w-full" />
              <p class="text-xs text-gray-500 mt-1">{{ t('profile.emailNotChangeable') }}</p>
            </UFormField>

            <UFormField :label="t('profile.username')" name="username">
              <UInput v-model="profileFormState.username" icon="i-heroicons-user" class="w-full" />
            </UFormField>

            <UFormField :label="t('common.user')" name="name">
              <UInput v-model="profileFormState.name" icon="i-heroicons-identification" class="w-full" />
            </UFormField>
             
            <UFormField label="Phone" name="phone">
               <UInput v-model="profileFormState.phone" icon="i-heroicons-phone" class="w-full" />
            </UFormField>

            <div class="flex justify-end">
              <UButton type="submit" :loading="loading">
                {{ t('profile.saveChanges') }}
              </UButton>
            </div>
          </UForm>
        </UCard>
      </template>

      <template #security="{ item }">
        <div class="space-y-6 mt-4">
          <!-- Password Section -->
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">{{ t('profile.changePassword') }}</h3>
              <p class="text-sm text-gray-500">{{ t('profile.passwordDescription') }}</p>
            </template>
            
            <UForm :schema="schemaPassword" :state="passwordState" class="space-y-4" @submit="onPasswordSubmit">
              <UFormField :label="t('profile.currentPassword')" name="currentPassword">
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

              <UFormField :label="t('profile.newPassword')" name="password">
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

                  <p id="password-strength" class="text-sm font-medium">
                    {{ strengthText }}. {{ t('profile.passwordStrength.mustContain') }}
                  </p>
                  <ul class="space-y-1" aria-label="Password requirements">
                    <li
                      v-for="(req, index) in strength"
                      :key="index"
                      class="flex items-center gap-1"
                      :class="req.met ? 'text-[var(--ui-success)]' : 'text-[var(--ui-text-muted)]'"
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
                <UButton type="submit" :loading="loading" color="neutral">
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
                        <h3 class="text-lg font-semibold">{{ t('profile.twoFactorAuth') }}</h3>
                        <p class="text-sm text-gray-500">{{ t('profile.twoFactorDescription') }}</p>
                    </div>
                     <UBadge :color="is2FAEnabled ? 'success' : 'neutral'" variant="subtle">
                        {{ is2FAEnabled ? t('profile.enabled') : t('profile.notVerified') }}
                     </UBadge>
                </div>
             </template>
             
             <div class="flex justify-between items-center">
                 <div class="text-sm">
                     <p v-if="is2FAEnabled">
                         Your account is secured with 2FA.
                     </p>
                     <p v-else>
                         Protect your account by enabling Two-Factor Authentication.
                     </p>
                 </div>
                 <UButton v-if="!is2FAEnabled" @click="start2FAFlow" icon="i-heroicons-shield-check">
                     {{ t('profile.enable') }}
                 </UButton>
                 <UButton v-else color="error" variant="ghost" @click="disable2FA" icon="i-heroicons-trash">
                     {{ t('profile.disable') }}
                 </UButton>
             </div>
          </UCard>
        </div>
      </template>
    </UTabs>

    <!-- 2FA Modal -->
    <UModal v-model="is2FAModalOpen">
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4">{{ t('profile.modals.twoFactor.scanQrTitle') }}</h3>
            
            <div v-if="totpStep === 'scan'" class="text-center space-y-4">
                <p>{{ t('profile.modals.twoFactor.scanQrDesc') }}</p>
                <div v-if="totpData?.qrCodeUri" class="flex justify-center p-4 bg-white rounded">
                     <!-- We need a QR code component or image. For now, assume qrCodeUri is a data URI or we display secret -->
                     <img v-if="totpData.qrCodeUri.startsWith('data:')" :src="totpData.qrCodeUri" alt="QR Code" class="max-w-[200px]" />
                     <div v-else class="text-xs break-all border p-2 rounded">
                        QR URI: {{ totpData.qrCodeUri }}
                     </div>
                </div>
                <div class="text-sm text-gray-500">
                    Secret: <span class="font-mono">{{ totpData?.secret }}</span>
                </div>
                
                <UFormField :label="t('profile.modals.twoFactor.enterCode')">
                    <UInput v-model="totpCode" placeholder="000000" class="text-center text-xl tracking-widest w-full" />
                </UFormField>
                
                <UButton block @click="verify2FASetup" :disabled="totpCode.length < 6" :loading="loading">
                    {{ t('profile.modals.twoFactor.verifyAndActivate') }}
                </UButton>
            </div>
        </div>
    </UModal>
  </UContainer>
</template>
