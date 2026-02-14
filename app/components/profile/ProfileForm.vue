<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { UserCustomData } from '#imports'

const { t } = useI18n()
const { session } = useAuthSession()
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
  phone: props.phone || session.value?.user?.phone_number || '',
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
        address: event.data.address
      }
    })
    toast.add({ title: t('profile.toasts.profileUpdated'), color: 'success' })
    emit('updated')
  } catch {
    toast.add({ title: t('profile.errors.updateProfile'), color: 'error' })
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('profile.profileInfo') }}
      </h3>
    </template>

    <UForm
      :schema="schema"
      :state="formState"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        :label="t('profile.email')"
        name="email"
      >
        <UInput
          v-model="formState.email"
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
          v-model="formState.username"
          icon="i-heroicons-user"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="t('common.user')"
        name="name"
      >
        <UInput
          v-model="formState.name"
          icon="i-heroicons-identification"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="t('profile.phone')"
        name="phone"
      >
        <UInput
          v-model="formState.phone"
          icon="i-heroicons-phone"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="t('profile.address')"
        name="address"
      >
        <UInput
          v-model="formState.address"
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
