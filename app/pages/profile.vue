<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  requiresAuth: true
})

const activeSection = ref<'profile' | 'security' | 'danger'>('profile')
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Profile Header -->
      <ProfileHeader />

      <!-- Mobile/Desktop Navigation -->
      <ProfileNav v-model:active-section="activeSection" />

      <!-- Main Content Area -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
        mode="out-in"
      >
        <!-- Profile Section -->
        <ProfileForm v-if="activeSection === 'profile'" />

        <!-- Security Section -->
        <div
          v-else-if="activeSection === 'security'"
          class="space-y-4"
        >
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ $t('profile.security') }}
          </h2>

          <ProfilePasswordChangeForm />
          <ProfileTwoFactorSection />
        </div>

        <!-- Danger Zone Section -->
        <ProfileDangerZoneSection v-else-if="activeSection === 'danger'" />
      </Transition>
    </div>
  </UContainer>
</template>
