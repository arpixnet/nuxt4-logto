import type { H3Event } from 'h3'
import { z } from 'zod'
import { emailLogger, logError } from '../../utils/logger'

/**
 * Logto HTTP Email Connector Endpoint
 *
 * This endpoint receives email requests from Logto's HTTP email connector
 * and sends emails using nuxt-arpix-email-sender.
 *
 * Payload from Logto:
 * {
 *   "to": "user@example.com",
 *   "type": "SignIn" | "Register" | "ForgotPassword" | "Generic" | "OrganizationInvitation" | "UserPermissionValidation" | "BindNewIdentifier" | "MfaVerification" | "BindMfa",
 *   "payload": {
 *     "code": "123456",
 *     "locale": "en",
 *     // Additional variables based on type
 *   }
 * }
 *
 * @see https://docs.logto.io/integrations/http-email
 */

// Logto email types
export type LogtoEmailType
  = 'SignIn'
    | 'Register'
    | 'ForgotPassword'
    | 'Generic'
    | 'OrganizationInvitation'
    | 'UserPermissionValidation'
    | 'BindNewIdentifier'
    | 'MfaVerification'
    | 'BindMfa'

// Valid email types for validation
const EMAIL_TYPES = [
  'SignIn',
  'Register',
  'ForgotPassword',
  'Generic',
  'OrganizationInvitation',
  'UserPermissionValidation',
  'BindNewIdentifier',
  'MfaVerification',
  'BindMfa'
] as const

// Validation schema for Logto payload
const LogtoEmailSchema = z.object({
  to: z.string().email(),
  type: z.enum(EMAIL_TYPES),
  payload: z.record(z.string(), z.unknown())
})

// Subject lines for each email type (can be overridden in templates)
const emailSubjects: Record<LogtoEmailType, string> = {
  SignIn: 'Verify your email to sign in',
  Register: 'Verify your email to complete registration',
  ForgotPassword: 'Reset your password',
  Generic: 'Verification code',
  OrganizationInvitation: 'You have been invited to join an organization',
  UserPermissionValidation: 'Verify your identity',
  BindNewIdentifier: 'Verify your new email address',
  MfaVerification: 'Your MFA verification code',
  BindMfa: 'Verify your email for MFA setup'
}

// Validate authorization token if configured
function validateAuthToken(event: H3Event): boolean {
  const config = useRuntimeConfig(event)
  const expectedToken = config.logtoEmailAuthToken

  // If no token is configured, allow all requests (not recommended for production)
  if (!expectedToken) {
    emailLogger.warn('No LOGTO_EMAIL_AUTH_TOKEN configured - endpoint is open')
    return true
  }

  const authHeader = getHeader(event, 'authorization')

  if (!authHeader) {
    return false
  }

  // Support both "Bearer token" and just "token" formats
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  return token === expectedToken
}

// Get localized subject line
function getSubject(type: LogtoEmailType, _locale?: string): string {
  const baseSubject = emailSubjects[type]

  // You can extend this to support localized subjects
  // For now, we use English subjects
  return baseSubject
}

// Map Logto type to template name
function getTemplateName(type: LogtoEmailType): string {
  return `logto/${type.toLowerCase()}`
}

export default defineEventHandler(async (event: H3Event) => {
  // Validate authorization
  if (!validateAuthToken(event)) {
    emailLogger.warn('Unauthorized email request - invalid or missing token')
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // Parse and validate request body
  const body = await readBody(event)
  const parseResult = LogtoEmailSchema.safeParse(body)

  if (!parseResult.success) {
    emailLogger.error({ errors: parseResult.error.issues }, 'Invalid email request payload')
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request payload',
      data: parseResult.error.issues
    })
  }

  const { to, type, payload } = parseResult.data
  const { locale, ...templateVars } = payload

  emailLogger.info({ to, type, locale }, 'Processing Logto email request')

  try {
    const sender = useMailSender()
    const templateName = getTemplateName(type)
    const subject = getSubject(type, locale as string | undefined)

    // Prepare template context with all payload variables
    const context = {
      // Spread all payload variables
      ...templateVars,
      // Add common helpers
      locale: locale || 'en',
      // Format application info if present
      application: templateVars.application as Record<string, unknown> | undefined,
      // Format organization info if present
      organization: templateVars.organization as Record<string, unknown> | undefined,
      // Format user info if present
      user: templateVars.user as Record<string, unknown> | undefined,
      // Format inviter info if present
      inviter: templateVars.inviter as Record<string, unknown> | undefined,
      // Current year for footer
      currentYear: new Date().getFullYear()
    }

    // Send email using the template
    const info = await sender.send({
      to,
      subject,
      template: templateName,
      context
    })

    emailLogger.info({ to, type, messageId: info.messageId }, 'Email sent successfully')

    return {
      success: true,
      messageId: info.messageId
    }
  } catch (error) {
    logError(emailLogger, error, 'Failed to send email', { to, type })
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send email',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})
