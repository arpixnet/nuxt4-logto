import type { H3Event } from 'h3'
import { createLogger, logError } from '#utils/logger'

const logger = createLogger('profile-update')

type ProxyOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown> | null
  headers?: Record<string, string>
}

const proxyLogto = async (event: H3Event, path: string, options: ProxyOptions = {}) => {
  const client = event.context.logtoClient as { getAccessToken: () => Promise<string> } | undefined
  if (!client) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized: Logto client not available'
    })
  }

  try {
    const accessToken = await client.getAccessToken()
    const logtoEndpoint = process.env.NUXT_LOGTO_ENDPOINT || 'http://localhost:3001'
    const apiBase = `${logtoEndpoint}/api/my-account`

    return await $fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
  } catch (e) {
    const error = e as { response?: { status: number }, message?: string }
    logError(logger, error, 'Logto API proxy error', {
      status: error.response?.status
    })
    throw createError({
      statusCode: error.response?.status || 500,
      message: error.message || 'Failed to communicate with Logto'
    })
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return await proxyLogto(event, '', {
    method: 'PATCH',
    body
  })
})
