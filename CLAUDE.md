# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Development
npm dev              # Start development server on http://localhost:3000
npm build            # Production build
npm preview          # Preview production build locally

# Code Quality
npm lint             # Run ESLint
npm typecheck        # Run TypeScript type checking

# Docker (infrastructure)
docker compose -f docker/docker-compose.yml up -d              # Start all services
docker compose -f docker/docker-compose.yml --profile init up logto-init  # Initialize Logto (first time only)
```

## Architecture Overview

This is a Nuxt 4 application using the app directory structure (not `pages/`), with Logto authentication, Hasura GraphQL, and i18n support.

### Key Technologies
- **Nuxt 4** with app router structure
- **TypeScript** throughout
- **Nuxt UI** v4 for components
- **Logto** for authentication via `@logto/nuxt`
- **Hasura GraphQL** for backend API
- **Nuxt i18n** for internationalization (English/Spanish)
- **nuxt-arpix-email-sender** for emails (Gmail OAuth2)
- **Tailwind CSS** v4 for styling

### Directory Structure

```
app/                      # Nuxt 4 app directory (auto-imported)
├── components/layout/   # Layout components (header, footer, auth, language selector)
├── composables/         # Auth composables (useAuthSession, useAuthConfig)
├── lib/                 # Utility libraries
├── pages/               # Page components
└── assets/css/          # Global styles

server/                   # Server-side code
├── api/auth/jwt.get.ts  # JWT endpoint for Hasura integration
└── emails/templates/    # Email templates for nuxt-arpix-email-sender

i18n/locales/            # Translation files (en.json, es.json)
docker/                   # Docker Compose for infrastructure
```

## Authentication Architecture

The app uses Logto for authentication with a custom composable layer:

### Client-side Auth
- `useAuthSession()` - Wrapper around `useLogtoUser()` providing `isAuthenticated` and `session`
- `useAuthConfig()` - Auth UI configuration (logo, app name)
- Logto handles sign-in/sign-out routes automatically (`/sign-in`, `/sign-out`)

### Server-side Auth (JWT for Hasura)
- `/api/auth/jwt` endpoint returns the Logto ID token with Hasura claims
- The Logto client is injected into the event context by `@logto/nuxt`
- JWT claims must be configured in Logto Console for Hasura integration:
  ```json
  {
    "https://hasura.io/jwt/claims": {
      "x-hasura-user-id": "{{user.sub}}",
      "x-hasura-default-role": "user",
      "x-hasura-allowed-roles": ["user", "admin"]
    }
  }
  ```

### Environment Variables for Auth
- `NUXT_LOGTO_ENDPOINT` - Logto server URL
- `NUXT_LOGTO_APP_ID` - Application ID from Logto Console
- `NUXT_LOGTO_APP_SECRET` - App secret for server-side
- `NUXT_LOGTO_COOKIE_ENCRYPTION_KEY` - Must be 32+ characters

## Internationalization (i18n)

- Two languages: English (default) and Spanish
- Uses `no_prefix` strategy (language stored in cookie)
- Language detection via `i18n_redirected` cookie
- Translation files in `i18n/locales/`
- Use `const { t } = useI18n()` in components

## Docker Infrastructure

The `docker/docker-compose.yml` includes:
- **PostgreSQL** (port 5432) - Application database
- **PostgreSQL** (port 5433) - Logto database (separate)
- **Hasura** (port 8080) - GraphQL engine
- **Redis** (port 6379) - Caching/rate limiting
- **Logto** (ports 3001 API, 3002 Admin Console) - Auth service

First-time setup requires running the init profile to seed Logto database.

## Component Patterns

- Layout components in `app/components/layout/`
- Use Nuxt UI components (`UButton`, `UDropdownMenu`, `UAvatar`, etc.)
- All components use `<script setup lang="ts">` syntax
- Composables are auto-imported

## Styling

- Tailwind CSS v4
- Nuxt UI theme with green primary color
- Custom "squircle" avatar shape via CSS mask
- Dark mode support built-in

## Email Configuration

Uses `nuxt-arpix-email-sender` with Gmail OAuth2:
- `EMAIL_USER` - Gmail address
- `EMAIL_FROM` - From address with display name
- `GMAIL_CLIENT_ID` - OAuth2 client ID
- `GMAIL_CLIENT_SECRET` - OAuth2 client secret
- `GMAIL_REFRESH_TOKEN` - OAuth2 refresh token
- Templates in `server/emails/templates/`
