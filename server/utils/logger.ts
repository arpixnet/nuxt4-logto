/**
 * Pino Logger Configuration
 *
 * Centralized logging configuration using pino.
 * Provides specialized loggers for different contexts.
 *
 * Usage:
 *   import { authLogger, emailLogger } from '#utils/logger'
 *   authLogger.info({ email }, 'User signed in')
 *   emailLogger.error({ error }, 'Failed to send email')
 */

import pino from 'pino'
import type { Logger } from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Redaction rules for sensitive data
 * Prevents logging of passwords, tokens, and other sensitive information
 * Includes nested paths for error responses and API data
 */
const redactPaths = [
  // HTTP headers
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  // Direct sensitive fields
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
  'sessionId',
  'verificationId',
  // Nested in error responses
  'error.response._data.secret',
  'error.response._data.token',
  'error.response._data.password',
  'error.data.secret',
  'error.data.token',
  'error.data.password',
  // Nested in result objects
  'result.secret',
  'result.secretQrCode',
  'result.token',
  'data.secret',
  'data.token',
  'data.password',
  // Wildcards for arrays and nested objects
  '*.secret',
  '*.token',
  '*.password',
  '*.accessToken',
  '*.refreshToken',
  'body.password',
  'body.currentPassword',
  'body.secret'
]

/**
 * Base configuration for all loggers
 */
const baseConfig = {
  level: process.env.LOG_LEVEL
    ? process.env.LOG_LEVEL
    : (isDev ? 'debug' : 'info'),
  formatters: {
    level: (label: string) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: isDev ? [] : redactPaths
}

/**
 * Transport configuration for pretty printing in development
 */
const transportConfig = isDev
  ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
        colorize: true,
        singleLine: false,
        messageFormat: '{msg}'
      }
    }
  : undefined

/**
 * Main logger instance
 */
export const logger: Logger = pino({
  ...baseConfig,
  transport: transportConfig
})

/**
 * Specialized loggers with predefined context
 * These provide automatic context tagging for easier log filtering
 */

export const authLogger = logger.child({ context: 'auth' })
export const emailLogger = logger.child({ context: 'email' })
export const rateLimitLogger = logger.child({ context: 'rate-limit' })
export const dbLogger = logger.child({ context: 'database' })
export const sessionLogger = logger.child({ context: 'session' })
export const apiLogger = logger.child({ context: 'api' })
export const middlewareLogger = logger.child({ context: 'middleware' })

/**
 * Helper function to create a logger with custom context
 *
 * @param context - The context name for this logger
 * @returns A pino logger instance with the specified context
 *
 * @example
 * const myLogger = createLogger('my-feature')
 * myLogger.info('Something happened')
 */
export function createLogger(context: string): Logger {
  return logger.child({ context })
}

/**
 * Helper to log errors with consistent format
 *
 * In production, only logs error name, message, and safe metadata.
 * In development, logs full error details including stack trace.
 *
 * @param logger - The logger instance to use
 * @param error - The error to log
 * @param message - Additional context message
 * @param data - Additional data to include in the log
 */
export function logError(
  logger: Logger,
  error: unknown,
  message: string,
  data?: Record<string, unknown>
): void {
  // In production, only log safe error information
  // This prevents accidental logging of sensitive data in error responses
  if (isDev) {
    // Development: log full error details for debugging
    const errorData = {
      ...data,
      error: error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        : error
    }
    logger.error(errorData, message)
  } else {
    // Production: log only safe error information
    const safeErrorInfo = error instanceof Error
      ? {
          name: error.name,
          // Truncate message to prevent potential sensitive data leakage
          message: error.message.substring(0, 200)
        }
      : { type: typeof error }

    const safeData = data ? { ...data } : {}

    // Remove any potentially sensitive fields from data
    const sensitiveFields = ['secret', 'token', 'password', 'apiKey', 'accessToken', 'refreshToken']
    for (const field of sensitiveFields) {
      if (field in safeData) {
        safeData[field] = '[REDACTED]'
      }
    }

    logger.error({ ...safeData, error: safeErrorInfo }, message)
  }
}

/**
 * Helper to log client-side errors received from the frontend
 *
 * @param level - Log level (error, warn, info)
 * @param context - Context from client
 * @param message - Log message
 * @param data - Additional data
 * @param clientInfo - Client information (userAgent, ip, etc)
 */
export function logClientEvent(
  level: string,
  context: string,
  message: string,
  data?: Record<string, unknown>,
  clientInfo?: Record<string, unknown>
): void {
  const loggerInstance = logger.child({ context: `client:${context}` })
  const logData = {
    ...data,
    client: clientInfo
  }

  switch (level) {
    case 'error':
      loggerInstance.error(logData, message)
      break
    case 'warn':
      loggerInstance.warn(logData, message)
      break
    case 'info':
      loggerInstance.info(logData, message)
      break
    case 'debug':
      loggerInstance.debug(logData, message)
      break
    default:
      loggerInstance.info(logData, message)
  }
}
