<script setup lang="ts">
/**
 * Dashboard Page
 *
 * Example dashboard page for the boilerplate.
 * Customize this page for your project needs.
 */

definePageMeta({
  middleware: 'auth',
  requiresAuth: true
})

useHead({
  title: 'Dashboard'
})

const { session } = useAuthSession()
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold">
          Dashboard
        </h1>
        <p class="mt-1 text-gray-500">
          Welcome back, {{ session?.user?.name || session?.user?.email || 'User' }}!
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-lg border p-4">
          <div class="flex items-center gap-3">
            <div
              class="rounded-lg bg-blue-100 p-2 dark:bg-blue-900"
            >
              <UIcon
                name="i-lucide-users"
                class="h-5 w-5 text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <p class="text-sm text-gray-500">
                Users
              </p>
              <p class="text-xl font-semibold">
                1,234
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-lg border p-4">
          <div class="flex items-center gap-3">
            <div
              class="rounded-lg bg-green-100 p-2 dark:bg-green-900"
            >
              <UIcon
                name="i-lucide-trending-up"
                class="h-5 w-5 text-green-600 dark:text-green-400"
              />
            </div>
            <div>
              <p class="text-sm text-gray-500">
                Growth
              </p>
              <p class="text-xl font-semibold">
                +12.5%
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-lg border p-4">
          <div class="flex items-center gap-3">
            <div
              class="rounded-lg bg-purple-100 p-2 dark:bg-purple-900"
            >
              <UIcon
                name="i-lucide-activity"
                class="h-5 w-5 text-purple-600 dark:text-purple-400"
              />
            </div>
            <div>
              <p class="text-sm text-gray-500">
                Active
              </p>
              <p class="text-xl font-semibold">
                573
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-lg border p-4">
          <div class="flex items-center gap-3">
            <div
              class="rounded-lg bg-orange-100 p-2 dark:bg-orange-900"
            >
              <UIcon
                name="i-lucide-dollar-sign"
                class="h-5 w-5 text-orange-600 dark:text-orange-400"
              />
            </div>
            <div>
              <p class="text-sm text-gray-500">
                Revenue
              </p>
              <p class="text-xl font-semibold">
                $12,345
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Links -->
      <div class="rounded-lg border p-6">
        <h2 class="mb-4 text-lg font-semibold">
          Quick Links
        </h2>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            to="/examples/graphql"
            class="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <UIcon
              name="i-lucide-database"
              class="h-5 w-5 text-gray-400"
            />
            <div>
              <p class="font-medium">
                GraphQL Demo
              </p>
              <p class="text-sm text-gray-500">
                Test GraphQL queries
              </p>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/profile"
            class="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <UIcon
              name="i-lucide-user"
              class="h-5 w-5 text-gray-400"
            />
            <div>
              <p class="font-medium">
                Profile
              </p>
              <p class="text-sm text-gray-500">
                Manage your account
              </p>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/settings"
            class="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <UIcon
              name="i-lucide-settings"
              class="h-5 w-5 text-gray-400"
            />
            <div>
              <p class="font-medium">
                Settings
              </p>
              <p class="text-sm text-gray-500">
                App preferences
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Placeholder Content -->
      <div class="rounded-lg border-2 border-dashed p-12 text-center">
        <UIcon
          name="i-lucide-layout-dashboard"
          class="mx-auto h-12 w-12 text-gray-400"
        />
        <h3 class="mt-4 text-lg font-medium">
          Dashboard Content
        </h3>
        <p class="mt-2 text-gray-500">
          Customize this page with your project's dashboard widgets and data.
        </p>
      </div>
    </div>
  </UContainer>
</template>
