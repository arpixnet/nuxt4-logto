<script setup lang="ts">
import { useAuthClient } from '~/lib/auth-client'

const { t } = useI18n()
const { session } = useAuthSession()
const jwtToken = ref<string | null>(null)
const jwtPending = ref(false)
const jwtExpanded = ref(false)
const copyButtonText = ref<string>(t('jwt.copy'))
const authClient = useAuthClient()

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Nuxt Starter Template'
const description = 'A production-ready starter template powered by Nuxt UI. Build beautiful, accessible, and performant applications in minutes, not hours.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterCard: 'summary_large_image'
})

onMounted(async () => {
  await nextTick()

  // Verificar si hay un usuario autenticado
  if (session.value?.user && !jwtToken.value) {
    try {
      jwtPending.value = true
      // Pequeño retraso adicional para asegurar que las cookies estén disponibles
      await new Promise(resolve => setTimeout(resolve, 100))

      const { data, error } = await authClient.token()
      if (data?.token) {
        jwtToken.value = data.token
      }
      if (error) {
        console.error('[JWT] Error fetching token:', error)
      }
    } catch (error) {
      console.error('[JWT] Failed to fetch token:', error)
    } finally {
      jwtPending.value = false
    }
  }
})

// Función para copiar el token al portapapeles
const copyToken = async () => {
  if (jwtToken.value) {
    try {
      await navigator.clipboard.writeText(jwtToken.value)
      copyButtonText.value = t('jwt.copied')
      setTimeout(() => {
        copyButtonText.value = t('jwt.copy')
      }, 2000)
    } catch (error) {
      console.error('Failed to copy token:', error)
      // Fallback para navegadores que no soporten la API
      const textArea = document.createElement('textarea')
      textArea.value = jwtToken.value
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      copyButtonText.value = t('jwt.copied')
      setTimeout(() => {
        copyButtonText.value = t('jwt.copy')
      }, 2000)
    }
  }
}
</script>

<template>
  <UContainer>
    <UPageHero
      title="Nuxt Starter Template"
      description="A production-ready starter template powered by Nuxt UI. Build beautiful, accessible, and performant applications in minutes, not hours."
      :links="[{
        label: 'Get started',
        to: 'https://github.com/arpixnet/nuxt4-logto/README.md',
        target: '_blank',
        trailingIcon: 'i-lucide-arrow-right',
        size: 'xl'
      }, {
        label: 'Use this template',
        to: 'https://github.com/arpixnet/nuxt4-logto',
        target: '_blank',
        icon: 'i-simple-icons-github',
        size: 'xl',
        color: 'neutral',
        variant: 'subtle'
      }]"
    />

    <UPageSection v-if="session?.user">
      <!-- JWT Token Section con UCollapsible -->
      <UCollapsible v-model:open="jwtExpanded">
        <UButton
          variant="soft"
          color="primary"
          block
          class="justify-between"
        >
          <span class="flex items-center gap-2">
            <UIcon name="i-heroicons-key" />
            {{ t('jwt.title') }}
          </span>
          <UIcon
            :name="jwtExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          />
        </UButton>

        <template #content>
          <UCard class="mt-2">
            <div class="space-y-4">
              <!-- Header del card con botón de copiar -->
              <div class="flex items-center justify-between">
                <span class="text-sm text-muted">
                  {{ t('jwt.sessionInfo') }}
                </span>
                <UButton
                  size="sm"
                  variant="ghost"
                  :disabled="!jwtToken || jwtPending"
                  @click="copyToken"
                >
                  <span class="flex items-center gap-2">
                    <UIcon name="i-heroicons-clipboard-document" />
                    {{ jwtPending ? t('jwt.loading') : copyButtonText }}
                  </span>
                </UButton>
              </div>

              <!-- Contenido del JWT -->
              <div class="bg-muted/50 p-3 rounded-lg border">
                <div
                  v-if="jwtPending"
                  class="flex items-center justify-center py-4"
                >
                  <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
                <code
                  v-else-if="jwtToken"
                  class="text-xs text-foreground break-all block"
                >
                  {{ jwtToken }}
                </code>
                <div
                  v-else
                  class="text-muted text-sm py-2 text-center"
                >
                  {{ t('jwt.noToken') }}
                </div>
              </div>
            </div>
          </UCard>
        </template>
      </UCollapsible>

      <!-- Session Info -->
      <div class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg overflow-auto max-h-96">
        <h2 class="text-lg font-semibold">
          {{ t('jwt.userInfo') }}
        </h2>
        <pre class="text-xs text-foreground">{{ JSON.stringify(session, null, 2) }}</pre>
      </div>
    </UPageSection>

    <UPageSection
      id="features"
      title="Everything you need to build modern Nuxt apps"
      description="Start with a solid foundation. This template includes all the essentials for building production-ready applications with Nuxt UI's powerful component system."
      :features="[{
        icon: 'i-lucide-rocket',
        title: 'Production-ready from day one',
        description: 'Pre-configured with TypeScript, ESLint, Tailwind CSS, and all the best practices. Focus on building features, not setting up tooling.'
      }, {
        icon: 'i-lucide-palette',
        title: 'Beautiful by default',
        description: 'Leveraging Nuxt UI\'s design system with automatic dark mode, consistent spacing, and polished components that look great out of the box.'
      }, {
        icon: 'i-lucide-zap',
        title: 'Lightning fast',
        description: 'Optimized for performance with SSR/SSG support, automatic code splitting, and edge-ready deployment. Your users will love the speed.'
      }, {
        icon: 'i-lucide-blocks',
        title: '100+ components included',
        description: 'Access Nuxt UI\'s comprehensive component library. From forms to navigation, everything is accessible, responsive, and customizable.'
      }, {
        icon: 'i-lucide-code-2',
        title: 'Developer experience first',
        description: 'Auto-imports, hot module replacement, and TypeScript support. Write less boilerplate and ship more features.'
      }, {
        icon: 'i-lucide-shield-check',
        title: 'Built for scale',
        description: 'Enterprise-ready architecture with proper error handling, SEO optimization, and security best practices built-in.'
      }]"
    />
  </UContainer>
</template>
