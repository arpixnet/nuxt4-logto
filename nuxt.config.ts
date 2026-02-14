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
    },
    // Token for Logto HTTP email connector authentication
    logtoEmailAuthToken: process.env.LOGTO_EMAIL_AUTH_TOKEN,
    // Minio configuration
    minioRootUser: process.env.MINIO_ROOT_USER,
    minioRootPassword: process.env.MINIO_ROOT_PASSWORD,
    minioBucketName: process.env.MINIO_BUCKET_NAME,
    minioUser: process.env.MINIO_USER,
    minioPassword: process.env.MINIO_PASSWORD,
    minioAccessKey: process.env.MINIO_ACCESS_KEY,
    minioSecretKey: process.env.MINIO_SECRET_KEY
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  arpixEmailSender: {
    transport: 'smtp',
    defaultFrom: process.env.EMAIL_FROM || '"Your App" <noreply@yourdomain.com>',
    smtp: {
      service: 'smtp',
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || 'info@yourdomain.com',
        pass: process.env.EMAIL_PASSWORD || 'your-password'
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
