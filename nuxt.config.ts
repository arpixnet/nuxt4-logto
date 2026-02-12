// https://nuxt.com/docs/api/configuration/nuxt-config
import { UserScope } from '@logto/nuxt'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@logto/nuxt',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxtjs/seo',
    '@nuxtjs/i18n',
    'nuxt-arpix-email-sender'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],
  site: {
    url: process.env.BASE_URL || 'http://localhost:3000',
    name: process.env.APP_NAME || 'Arpix App',
    description: 'Production ready Nuxt 4 boilerplate with Logto authentication',
    defaultLocale: 'en'
  },

  runtimeConfig: {
    public: {
      appName: process.env.APP_NAME || 'Arpix Solutions'
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  arpixEmailSender: {
    transport: 'smtp',
    defaultFrom: process.env.EMAIL_FROM || '"Your App" <noreply@yourdomain.com>',
    smtp: {
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER || 'info@yourdomain.com',
        clientId: process.env.GMAIL_CLIENT_ID || '',
        clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
        refreshToken: process.env.GMAIL_REFRESH_TOKEN || ''
      }
    },
    templates: {
      dir: 'server/emails/templates'
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  i18n: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    locales: [
      { code: 'es', language: 'es-ES', file: 'es.json', flag: '🇪🇸', name: 'Español', shortName: 'ES' },
      { code: 'en', language: 'en-US', file: 'en.json', flag: '🇬🇧', name: 'English', shortName: 'EN' }
    ],
    defaultLocale: 'en',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: false,
      cookieCrossOrigin: process.env.NODE_ENV === 'production'
    }
  },
  image: {
    format: ['avif', 'webp'],
    provider: 'ipx',
    quality: 80,
    densities: [1, 2],
    ipx: {
      maxAge: 60 * 60 * 24 * 365
    }
    // domains: ['example.com']
  },
  logto: {
    scopes: [
      UserScope.Email,
      UserScope.Phone,
      UserScope.CustomData,
      UserScope.Identities,
      UserScope.Profile,
      UserScope.Address,
      UserScope.Organizations,
      UserScope.OrganizationRoles,
      UserScope.Roles
    ],
    fetchUserInfo: true
  }
})
