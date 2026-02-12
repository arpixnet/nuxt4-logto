import type { H3Event } from 'h3'

const proxyLogto = async (event: H3Event, path: string, options: any = {}) => {
  const client = event.context.logtoClient as any
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
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
  } catch (e: any) {
    console.error('Logto API proxy error:', e)
    throw createError({
      statusCode: e.response?.status || 500,
      message: e.message || 'Failed to communicate with Logto'
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
