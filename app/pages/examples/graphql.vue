<script setup lang="ts">
/**
 * GraphQL Demo Page
 *
 * A demonstration page showing all GraphQL client features.
 * Visit /examples/graphql to see it in action.
 */

definePageMeta({
  middleware: 'auth'
})

useHead({
  title: 'GraphQL Examples'
})
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold">
        GraphQL Client Examples
      </h1>
      <p class="mt-2 text-gray-500">
        Secure GraphQL client with Hasura and Logto authentication.
        Tokens are stored only in memory.
      </p>
    </div>

    <ExamplesGraphQLExample />
  </UContainer>
</template>
