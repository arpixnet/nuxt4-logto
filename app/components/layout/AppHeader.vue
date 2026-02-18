<template>
  <UHeader>
    <template #left>
      <LayoutAppLogo class="h-6 w-auto shrink-0" />
    </template>

    <!-- Main Navigation Menu (Desktop) -->
    <LayoutMenuAppMenu
      menu="main"
      variant="horizontal"
    />

    <template #right>
      <LayoutLanguageSelector />
      <UColorModeButton />
      <LayoutAuthUser />
    </template>

    <!-- Mobile Navigation Menu (handled by UHeader) -->
    <template #body>
      <LayoutMenuAppMenu
        menu="main"
        variant="vertical"
        class="-mx-2.5"
      />
    </template>
  </UHeader>
</template>
