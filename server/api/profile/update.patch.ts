import { logtoProxy } from '../../utils/logto-proxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return await logtoProxy(event, '', {
    method: 'PATCH',
    body
  })
})
