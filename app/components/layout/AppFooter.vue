<template>
  <UContainer class="mt-4">
    <!-- Footer Navigation -->
    <LayoutMenuAppMenu
      menu="footer"
      variant="footer-columns"
    />
  </UContainer>
  <UFooter>
    <template #left>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Built with Nuxt UI • © {{ new Date().getFullYear() }}
      </p>
    </template>

    <template #right>
      <UButton
        to="https://github.com/arpixnet/nuxt4-logto"
        target="_blank"
        icon="i-simple-icons-github"
        aria-label="GitHub"
        color="neutral"
        variant="ghost"
      />
    </template>
  </UFooter>
</template>
