<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  requiresAuth: true
})

const { t } = useI18n()

// Tabs
const items = [{
  slot: 'profile',
  label: t('profile.profileInfo')
}, {
  slot: 'security',
  label: t('profile.security')
}]
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
        <ProfileForm class="mt-4" />
      </template>

      <template #security>
        <div class="space-y-6 mt-4">
          <ProfilePasswordChangeForm />
          <ProfileTwoFactorSection />
          <ProfileDangerZoneSection />
        </div>
      </template>
    </UTabs>
  </UContainer>
</template>
