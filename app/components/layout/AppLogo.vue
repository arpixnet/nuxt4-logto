<script lang="ts" setup>
const { t } = useI18n()
const { config: authPageConfig } = useAuthConfig()
</script>

<template>
  <NuxtLink
    to="/"
    class="flex items-center gap-3"
  >
    <img
      v-if="authPageConfig.logo.imageUrl"
      :src="authPageConfig.logo.imageUrl"
      :alt="t('header.logo')"
      class="h-6 w-auto"
    >
    <h2
      v-else
      class="font-bold tracking-tight text-gray-900 dark:text-white text-xl"
    >
      {{ authPageConfig.appName }}
    </h2>
  </NuxtLink>
</template>
