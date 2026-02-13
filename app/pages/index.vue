<script setup lang="ts">
import { useAuthClient } from '~/lib/auth-client'

const { t } = useI18n()
const { session } = useAuthSession()
const jwtToken = ref<string | null>(null)
const jwtPending = ref(false)
const jwtExpanded = ref(false)
const copyButtonText = ref<string>(t('jwt.copy'))
const authClient = useAuthClient()
const clientLogger = useClientLogger()

// SEO meta using i18n
const seoTitle = computed(() => t('seo.home.title'))
const seoDescription = computed(() => t('seo.home.description'))

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

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
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
        clientLogger.error('jwt', 'Error fetching token', error)
      }
    } catch (error) {
      clientLogger.error('jwt', 'Failed to fetch token', error)
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
      clientLogger.error('jwt', 'Failed to copy token to clipboard', error)
      copyButtonText.value = t('jwt.copyFailed')
      setTimeout(() => {
        copyButtonText.value = t('jwt.copy')
      }, 2000)
    }
  }
}

// Features for the page section using i18n
const features = computed(() => [
  {
    icon: 'i-lucide-rocket',
    title: t('seo.home.features.productionReady.title'),
    description: t('seo.home.features.productionReady.description')
  },
  {
    icon: 'i-lucide-palette',
    title: t('seo.home.features.beautifulDefault.title'),
    description: t('seo.home.features.beautifulDefault.description')
  },
  {
    icon: 'i-lucide-zap',
    title: t('seo.home.features.lightningFast.title'),
    description: t('seo.home.features.lightningFast.description')
  },
  {
    icon: 'i-lucide-blocks',
    title: t('seo.home.features.componentsIncluded.title'),
    description: t('seo.home.features.componentsIncluded.description')
  },
  {
    icon: 'i-lucide-code-2',
    title: t('seo.home.features.developerExperience.title'),
    description: t('seo.home.features.developerExperience.description')
  },
  {
    icon: 'i-lucide-shield-check',
    title: t('seo.home.features.builtForScale.title'),
    description: t('seo.home.features.builtForScale.description')
  }
])
</script>

<template>
  <UContainer>
    <UPageHero
      :title="t('seo.home.title')"
      :description="t('seo.home.description')"
      :links="[{
        label: t('seo.home.getStarted'),
        to: 'https://github.com/arpixnet/nuxt4-logto/README.md',
        target: '_blank',
        trailingIcon: 'i-lucide-arrow-right',
        size: 'xl'
      }, {
        label: t('seo.home.useTemplate'),
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
      :title="t('seo.home.featuresTitle')"
      :description="t('seo.home.featuresDescription')"
      :features="features"
    />
  </UContainer>
</template>
