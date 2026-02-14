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
</script>

<template>
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
      :schema="schema"
      :state="passwordState"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        :label="t('profile.currentPassword')"
        name="currentPassword"
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
              variant="link"
              size="sm"
              :icon="currentPasswordVisibility.icon.value"
              :aria-label="currentPasswordVisibility.ariaLabel.value"
              :aria-pressed="currentPasswordVisibility.visible.value"
              @click="currentPasswordVisibility.toggle"
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
            :type="newPasswordVisibility.type.value"
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
                :icon="newPasswordVisibility.icon.value"
                :aria-label="newPasswordVisibility.ariaLabel.value"
                :aria-pressed="newPasswordVisibility.visible.value"
                @click="newPasswordVisibility.toggle"
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
</template>
