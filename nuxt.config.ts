// https://nuxt.com/docs/api/configuration/nuxt-config
import { UserScope } from '@logto/nuxt'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@logto/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      appName: process.env.APP_NAME || 'Arpix Solutions'
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-07-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  logto: {
    scopes: [UserScope.Email, UserScope.Phone, UserScope.CustomData],
    fetchUserInfo: true
  }
})
