<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const { t } = useI18n()
const { changePassword, loading } = useUserProfile()
const clientLogger = useClientLogger()
const toast = useToast()

const currentPasswordVisibility = usePasswordVisibility()
const newPasswordVisibility = usePasswordVisibility()

const passwordState = reactive({
  currentPassword: '',
  password: ''
})

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
const strengthPercent = computed(() => (strengthScore.value / 4) * 100)

const schema = computed(() => z.object({
  currentPassword: z.string().min(1, t('validation.currentPasswordRequired')),
  password: z.string().min(8, t('validation.passwordMinLength'))
}))

type Schema = z.output<typeof schema.value>

interface PasswordErrorData {
  errorType?: 'verification' | 'password_update'
  code?: string
  subCodes?: string[]
}

interface ServerError {
  data?: { data?: PasswordErrorData }
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await changePassword(event.data.password, event.data.currentPassword)
    toast.add({ title: t('profile.toasts.passwordChanged'), color: 'success' })
    passwordState.currentPassword = ''
    passwordState.password = ''
  } catch (e: unknown) {
    clientLogger.error('profile', 'Password change failed', e)
    const serverError = e as ServerError
    const errorData = serverError?.data?.data
    const { title, description } = resolvePasswordError(errorData)
    toast.add({ title, description, color: 'error' })
  }
}

function resolvePasswordError(errorData?: PasswordErrorData): { title: string, description: string } {
  if (!errorData) {
    return {
      title: t('profile.errors.changePassword'),
      description: t('profile.errors.serverError')
    }
  }

  const { errorType, code, subCodes } = errorData

  if (errorType === 'verification') {
    return {
      title: t('profile.errors.changePassword'),
      description: tryLogtoKey(code) || t('profile.errors.incorrectCurrentPassword')
    }
  }

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

  return {
    title: t('profile.errors.changePassword'),
    description: t('profile.errors.logto.unknown')
  }
}

function tryLogtoKey(code: string | undefined): string | null {
  if (!code) return null
  const key = `profile.errors.logto.${code}`
  const translated = t(key)
  return translated !== key ? translated : null
}
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
    <UForm
      :schema="schema"
      :state="passwordState"
      @submit="onSubmit"
    >
      <!-- Section Header -->
      <div class="p-4 sm:p-6 space-y-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-key-round" class="size-5 text-amber-500" />
          <h3 class="font-medium text-gray-900 dark:text-white">
            {{ t('profile.changePassword') }}
          </h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Current Password -->
          <UFormField
            :label="t('profile.currentPassword')"
            name="currentPassword"
            required
          >
            <UInput
              v-model="passwordState.currentPassword"
              :type="currentPasswordVisibility.type.value"
              icon="i-lucide-lock"
              :ui="{ trailing: 'pe-1' }"
              class="w-full"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :icon="currentPasswordVisibility.icon.value"
                  :aria-label="currentPasswordVisibility.ariaLabel.value"
                  @click="currentPasswordVisibility.toggle"
                />
              </template>
            </UInput>
          </UFormField>

          <!-- New Password -->
          <UFormField
            :label="t('profile.newPassword')"
            name="password"
            required
          >
            <UInput
              v-model="passwordState.password"
              :type="newPasswordVisibility.type.value"
              :color="strengthColor"
              icon="i-lucide-shield"
              :ui="{ trailing: 'pe-1' }"
              class="w-full"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :icon="newPasswordVisibility.icon.value"
                  :aria-label="newPasswordVisibility.ariaLabel.value"
                  @click="newPasswordVisibility.toggle"
                />
              </template>
            </UInput>
          </UFormField>
        </div>

        <!-- Strength Indicator -->
        <div
          v-if="passwordState.password"
          class="space-y-3 pt-2"
        >
          <!-- Progress Bar -->
          <div class="flex items-center gap-3">
            <div class="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                class="h-full transition-all duration-300 rounded-full"
                :class="{
                  'bg-error-500': strengthScore <= 1,
                  'bg-warning-500': strengthScore === 2 || strengthScore === 3,
                  'bg-success-500': strengthScore === 4
                }"
                :style="{ width: `${strengthPercent}%` }"
              />
            </div>
            <span
              class="text-xs font-medium whitespace-nowrap"
              :class="{
                'text-error-500': strengthScore <= 1,
                'text-warning-500': strengthScore === 2 || strengthScore === 3,
                'text-success-500': strengthScore === 4
              }"
            >
              {{ strengthText }}
            </span>
          </div>

          <!-- Requirements Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div
              v-for="(req, index) in strength"
              :key="index"
              class="flex items-center gap-1.5 text-xs"
              :class="req.met ? 'text-success-600 dark:text-success-400' : 'text-gray-400'"
            >
              <UIcon
                :name="req.met ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                class="size-3.5"
              />
              {{ req.text }}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
        <UButton
          type="submit"
          :loading="loading"
        >
          <UIcon name="i-lucide-key-round" class="size-4 mr-1.5" />
          {{ t('profile.updatePassword') }}
        </UButton>
      </div>
    </UForm>
  </div>
</template>
