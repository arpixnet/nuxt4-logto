<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { UserCustomData } from '#imports'

const { t } = useI18n()
const { session, updateUserProfile } = useAuthSession()
const { updateProfile, loading } = useUserProfile()
const toast = useToast()

const props = defineProps<{
  name?: string
  username?: string
  email?: string
  phone?: string
  address?: string
}>()

const emit = defineEmits<{
  updated: []
}>()

const formState = reactive({
  name: props.name || session.value?.user?.name || '',
  username: props.username || session.value?.user?.username || '',
  email: props.email || session.value?.user?.email || '',
  phone: props.phone || (session.value?.user?.custom_data as UserCustomData | undefined)?.phone || '',
  address: props.address || (session.value?.user?.custom_data as UserCustomData | undefined)?.address || ''
})

const schema = computed(() => z.object({
  name: z.string().min(1, t('validation.nameRequired')),
  username: z.string().optional(),
  email: z.string().email(t('validation.emailInvalid')),
  phone: z.string().optional(),
  address: z.string().optional()
}))

type Schema = z.output<typeof schema.value>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await updateProfile({
      name: event.data.name,
      username: event.data.username,
      customData: {
        address: event.data.address,
        phone: event.data.phone
      }
    })

    // Update local session state without page refresh
    updateUserProfile({
      name: event.data.name,
      username: event.data.username,
      custom_data: {
        address: event.data.address,
        phone: event.data.phone
      } as UserCustomData
    })

    toast.add({ title: t('profile.toasts.profileUpdated'), color: 'success' })
    emit('updated')
  } catch {
    toast.add({ title: t('profile.errors.updateProfile'), color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Section Header -->
    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
      {{ t('profile.profileInfo') }}
    </h2>

    <!-- Form Card -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <UForm
        :schema="schema"
        :state="formState"
        @submit="onSubmit"
      >
        <div class="p-4 sm:p-6 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Name -->
            <UFormField
              :label="t('common.user')"
              name="name"
              required
            >
              <UInput
                v-model="formState.name"
                icon="i-lucide-user"
                class="w-full"
              />
            </UFormField>

            <!-- Username -->
            <UFormField
              :label="t('profile.username')"
              name="username"
            >
              <UInput
                v-model="formState.username"
                icon="i-lucide-at-sign"
                class="w-full"
              />
            </UFormField>

            <!-- Email (disabled) -->
            <UFormField
              :label="t('profile.email')"
              name="email"
            >
              <UInput
                v-model="formState.email"
                disabled
                icon="i-lucide-mail"
                class="w-full"
              />
            </UFormField>

            <!-- Phone -->
            <UFormField
              :label="t('profile.phone')"
              name="phone"
            >
              <UInput
                v-model="formState.phone"
                icon="i-lucide-phone"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Address (full width) -->
          <UFormField
            :label="t('profile.address')"
            name="address"
          >
            <UInput
              v-model="formState.address"
              icon="i-lucide-map-pin"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Footer Actions -->
        <div class="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <UButton
            type="submit"
            :loading="loading"
          >
            <UIcon
              name="i-lucide-save"
              class="size-4 mr-1.5"
            />
            {{ t('profile.saveChanges') }}
          </UButton>
        </div>
      </UForm>
    </div>
  </div>
</template>
