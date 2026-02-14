# Nuxt 4 Logto Boilerplate

[![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt&labelColor=020420)](https://nuxt.com)
[![Logto](https://img.shields.io/badge/Logto-Auth-0066FF?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xMjggNzBDMTU0LjUxIDcwIDE3NiA5MS40OTIyIDE3NiAxMThDMTc2IDE0NC41MDggMTU0LjUxIDE4NiAxMjggMTg2QzEwMS40OTIgMTg2IDgwIDE0NC41MDggODAgMTE4QzgwIDkxLjQ5MjIgMTAxLjQ5MiA3MCAxMjggNzBaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K&labelColor=020420)](https://logto.io)
[![Nuxt UI](https://img.shields.io/badge/Nuxt%20UI-4-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&labelColor=020420)](https://www.typescriptlang.org/)

Production-ready boilerplate for Nuxt 4 applications with complete authentication via Logto. Includes profile management, MFA/2FA, rate limiting, structured logging, and ready-to-use Hasura GraphQL integration.

## ✨ Features

### 🔐 Logto Authentication
- Complete integration with `@logto/nuxt`
- OAuth2/OIDC support
- Configured scopes: email, phone, custom_data, organizations, roles
- Secure sessions with encrypted cookies
- Social login support (Google, GitHub, etc.)

### 👤 Profile Management
- Complete profile page with section navigation
- Personal data editing (name, username, phone)
- Custom fields via Logto's `custom_data`
- Avatar upload to MinIO/S3 with real-time preview

### 🛡️ Security
- **MFA/2FA** with TOTP (Time-based One-Time Password)
- 2FA setup and takedown with verification
- Password change with validation
- Danger zone for account deletion

### 🚀 API & Middleware
- Middleware system for API routes
- JWT token validation
- Role-based access control (RBAC)
- Rate limiting with Redis (in-memory fallback)
- Automatic security headers

### 📊 Structured Logging
- Logging system with Pino
- Specialized loggers by context (auth, api, email, etc.)
- Client-side logging with server forwarding
- Automatic sensitive data redaction in production

### 🌐 Internationalization
- Multi-language support with `@nuxtjs/i18n`
- Included languages: Spanish and English
- Automatic browser detection

### 📧 Emails
- Integration with `nuxt-arpix-email-sender`
- SMTP and Gmail OAuth2 support
- Custom Handlebars templates
- HTTP connector for Logto

## 📋 Requirements

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Docker** (optional, for self-hosted Logto)
- **Redis** (optional, for distributed rate limiting)

## 🚀 Quick Start

### 1. Clone and configure

```bash
# Clone the repository
git clone <repository-url>
cd nuxt4-logto

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### 2. Configure Logto

**Option A: Logto Cloud (Recommended for production)**
1. Create an account at [logto.io](https://logto.io)
2. Create a "Traditional Web" application
3. Configure redirect URIs: `http://localhost:3000/callback`
4. Copy App ID, App Secret, and Endpoint to `.env`

**Option B: Self-hosted with Docker**
```bash
# Start services
docker compose -f docker/docker-compose.yml up -d

# Access Admin Console at http://localhost:3002
```

### 3. Start development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## ⚙️ Configuration

### Main Environment Variables

| Variable | Description | Required |
|----------|-------------|-----------|
| `NUXT_LOGTO_ENDPOINT` | Logto server URL | ✅ |
| `NUXT_LOGTO_APP_ID` | Logto application ID | ✅ |
| `NUXT_LOGTO_APP_SECRET` | Logto application secret | ✅ |
| `NUXT_LOGTO_COOKIE_ENCRYPTION_KEY` | Encryption key (32+ chars) | ✅ |
| `APP_NAME` | Application name | ❌ |
| `BASE_URL` | Application base URL | ❌ |
| `REDIS_HOST` | Redis host for rate limiting | ❌ |
| `MINIO_*` | MinIO configuration for avatars | ❌ |

See `.env.example` for the complete list of variables.

## 📁 Project Structure

```
nuxt4-logto/
├── app/                    # Nuxt application
│   ├── components/         # Vue components
│   │   ├── layout/         # Header, Footer, Logo, AuthUser
│   │   ├── profile/        # Profile components
│   │   └── ui/             # Reusable UI components
│   ├── composables/        # Vue composables
│   ├── layouts/            # Page layouts
│   ├── pages/              # Pages (auto-routing)
│   ├── middleware/         # Route middleware
│   └── lib/                # Client-side utilities
├── server/                 # Nuxt server
│   ├── api/                # API endpoints
│   │   ├── auth/           # Authentication (JWT)
│   │   ├── profile/        # Profile management
│   │   ├── avatar/         # Avatar uploads
│   │   └── email/          # Email sending
│   ├── middleware/         # Server middleware
│   ├── utils/              # Server-side utilities
│   └── emails/             # Email templates
├── shared/                 # Shared types
├── i18n/                   # Translation files
├── doc/                    # Additional documentation
└── docker/                 # Docker configuration
```

## 📚 Documentation

### API Middleware & Examples

The project includes a complete middleware system for API routes that provides JWT authentication, role-based authorization, rate limiting, and security headers. The documentation includes detailed examples of public, protected, and admin endpoints, along with usage patterns and error handling.

👉 [View API Middleware examples](./doc/api-middleware-examples.md)

### Custom Profile Fields

Logto allows storing additional user data in the `custom_data` field. This guide explains how to add new fields to the profile, update Zod validations, and maintain server synchronization. Includes important considerations about data overwriting and complete examples.

👉 [Read custom fields guide](./doc/custom-profile-fields.md)

### JWT Endpoint for Hasura

The `/api/auth/jwt` endpoint provides server-side access to the Logto ID token, enabling integration with external services like Hasura GraphQL Engine. The documentation covers token structure, usage examples with Hasura, expiration handling, and security considerations.

👉 [View JWT endpoint documentation](./doc/jwt-endpoint.md)

### Pino Logging System

The project uses Pino for structured logging on both server and client. Includes specialized loggers by context (auth, api, session, rate-limit, email), automatic sensitive data redaction in production, and a client-side composable to send critical logs to the server.

👉 [Explore logging guide](./doc/logging-guide.md)

### Redis Rate Limiting

Rate limiting system based on `rate-limiter-flexible` with Redis support and automatic in-memory fallback. Allows limiting by user or IP, configuring limits per operation, and includes development tools to clear limits during testing.

👉 [View rate limiting guide](./doc/rate-limiter-guide.md)

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Build preview |
| `npm run lint` | ESLint linting |
| `npm run typecheck` | Type checking |

## 🏗️ Main Components

### Composables

- **`useAuthSession`** - Session and user data management
- **`useUserProfile`** - Profile operations (update, delete)
- **`useAvatarUpload`** - Avatar upload to MinIO/S3
- **`useClientLogger`** - Client-side logging
- **`usePasswordVisibility`** - Password visibility toggle

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/jwt` | GET | Get JWT token |
| `/api/profile/update` | PATCH | Update profile |
| `/api/profile/password` | PATCH | Change password |
| `/api/profile/account` | DELETE | Delete account |
| `/api/profile/mfa/*` | GET/POST/DELETE | MFA management |
| `/api/avatar/upload` | POST | Upload avatar |
| `/api/log` | POST | Receive client logs |

## 🚢 Deployment

### Production build

```bash
npm run build
```

### Required environment variables in production

Make sure to configure all `NUXT_LOGTO_*` variables pointing to your production Logto instance. Update redirect URIs in Logto Console to include your production domain.

For more information, see the [Nuxt deployment documentation](https://nuxt.com/docs/getting-started/deployment).

## 📄 License

[MIT](./LICENSE)

---

Developed with ❤️ by [Arpix Solutions](https://arpix.net)
