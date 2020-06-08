import * as polka from 'polka'
import { json } from 'body-parser'

export async function initApp(): Promise<polka.polka> {
  const app = polka({})

  app.use(json()).use(async (request, response, next) => {
    if (request.url === '/health') {
      response.end('OK')
      return
    } else {
      next && (await next())
    }
  })

  return app
}
