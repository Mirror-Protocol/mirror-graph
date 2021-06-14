import * as Koa from 'koa'
import * as bodyParser from 'koa-body'
import * as Router from 'koa-router'
import * as helmet from 'koa-helmet'
import * as ratelimit from 'koa-ratelimit'
import * as cors from '@koa/cors'
import { configureRoutes } from 'koa-joi-controllers'
import controllers from 'endpoints'
import { apiErrorHandler, APIError, ErrorTypes } from 'lib/error'
import { error } from 'lib/response'
import { getMetricsContent } from '../lib/metrics'

const API_VERSION_PREFIX = '/v1'
const CORS_REGEXP =
  /^https:\/\/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.){0,3}mirror\.finance(?::\d{4,5})?(?:\/|$)/

export async function initApp(): Promise<Koa> {
  const app = new Koa()

  app.proxy = true

  app
    .use(async (ctx, next) => {
      await next()

      ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      ctx.set('Pragma', 'no-cache')
      ctx.set('Expires', '0')
    })
    .use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            'default-src': ["'self'"],
            'base-uri': ["'self'"],
            'block-all-mixed-content': [],
            'font-src': ["'self'", 'https:', 'data:'],
            'frame-ancestors': ["'self'"],
            'img-src': ["'self'", 'data:', 'cdn.jsdelivr.net'],
            'object-src': ["'none'"],
            'script-src': ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
            'script-src-attr': ["'none'"],
            'style-src': ["'self'", 'https:', "'unsafe-inline'"],
            'upgrade-insecure-requests': [],
          },
        },
      })
    )
    .use(apiErrorHandler(error))
    .use(
      cors({
        origin: (ctx) => {
          const requestOrigin = ctx.get('Origin')

          // if (process.env.NODE_ENV !== 'production') {
          //   return requestOrigin
          // }

          return CORS_REGEXP.test(requestOrigin) ? requestOrigin : ''
        },
        credentials: true,
      })
    )
    .use(
      bodyParser({
        multipart: true,
        jsonLimit: '112kb',
        onError: (error) => {
          throw new APIError(ErrorTypes.INVALID_REQUEST_ERROR, undefined, error.message)
        },
      })
    )
    .use(
      ratelimit({
        driver: 'memory',
        db: new Map(),
        id: (ctx) => ctx.ip,
        duration: 10 * 1000,
        max: 100,
        errorMessage: 'too many requests, please try again after 10 seconds',
        disableHeader: true,
      })
    )

  const router = new Router()

  router.get('/health', async (ctx) => {
    ctx.status = 200
    ctx.body = 'OK'
  })

  router.get('/metrics', async (ctx) => {
    const { data, type } = await getMetricsContent()
    ctx.status = 200
    ctx.response.headers['Content-Type'] = type
    ctx.response.body = data
  })

  configureRoutes(app, controllers, API_VERSION_PREFIX)

  app.use(router.routes())
  app.use(router.allowedMethods())

  return app
}
