import * as Koa from 'koa'
import * as bodyParser from 'koa-body'
import * as Router from 'koa-router'
import * as helmet from 'koa-helmet'
import * as path from 'path'
import * as glob from 'glob'
import { configureRoutes } from 'koa-joi-controllers'
import { apiErrorHandler, APIError, ErrorTypes } from 'lib/error'
import { error } from 'lib/response'

const API_VERSION_PREFIX = '/v1'

export async function initApp(): Promise<Koa> {
  const app = new Koa()

  app.proxy = true

  app
    .use(helmet())
    .use(apiErrorHandler(error))
    .use(async (ctx, next) => {
      await next()

      ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      ctx.set('Pragma', 'no-cache')
      ctx.set('Expires', '0')
    })
    .use(
      bodyParser({
        multipart: true,
        onError: (error) => {
          throw new APIError(ErrorTypes.INVALID_REQUEST_ERROR, undefined, error.message)
        },
      })
    )

  const router = new Router()

  router.get('/health', async (ctx) => {
    ctx.status = 200
    ctx.body = 'OK'
  })

  const paths = glob.sync(path.dirname(require.main.filename) + '/endpoints/api/*.ts')
  configureRoutes(
    app,
    paths.map((fileName) => new (require(fileName).default)()),
    API_VERSION_PREFIX
  )

  // routes && init
  // router.all(
  //   '(.*)',
  //   proxy({
  //     host: config.BYPASS_URI,
  //     changeOrigin: true,
  //     requestOptions: {
  //       strictSSL: false,
  //       timeout: 20000
  //     }
  //   })
  // )

  app.use(router.routes())
  app.use(router.allowedMethods())

  return app
}
