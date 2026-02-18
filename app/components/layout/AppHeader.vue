<template>
  <UHeader>
    <template #left>
      <LayoutAppLogo class="h-6 w-auto shrink-0" />
    </template>

    <!-- Main Navigation Menu -->
    <LayoutMenuAppMenu
      menu="main"
      variant="horizontal"
    />

    <template #right>
      <LayoutLanguageSelector />
      <UColorModeButton />
      <LayoutAuthUser />
    </template>
  </UHeader>
</template>
