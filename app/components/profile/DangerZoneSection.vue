<script setup lang="ts">
const { t } = useI18n()

const isDeleteModalOpen = ref(false)
</script>

<template>
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
        @click="isDeleteModalOpen = true"
      >
        {{ t('profile.dangerZone.deleteAccount') }}
      </UButton>
    </div>

    <ProfileDeleteAccountModal v-model:open="isDeleteModalOpen" />
  </UCard>
</template>
