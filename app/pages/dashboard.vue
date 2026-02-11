<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  requiresAuth: true
})
</script>

<template>
  <div>
    <UContainer class="p-4">
      <h1>Dashboard</h1>
    </UContainer>
  </div>
</template>
