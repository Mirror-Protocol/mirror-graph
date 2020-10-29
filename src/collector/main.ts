import 'reflect-metadata'
import * as bluebird from 'bluebird'
import { Container } from 'typedi'
import { initORM } from 'orm'
import { init as initErrorHandler, errorHandler } from 'lib/error'
import * as logger from 'lib/logger'
import { initMirror } from 'loaders'
import { validateConfig } from 'config'
import { collect } from './collect'

bluebird.config({ longStackTraces: true, warnings: { wForgottenReturn: false } })
global.Promise = bluebird as any // eslint-disable-line

async function loop(): Promise<void> {
  for (;;) {
    const now = Date.now()

    await collect(now)

    await bluebird.delay(100)
  }
}

async function main(): Promise<void> {
  logger.info('initialize collector')

  initErrorHandler({ sentryDsn: process.env.SENTRY_COLLECTOR })

  validateConfig()

  await initORM(Container)

  await initMirror()

  await loop()
}

if (require.main === module) {
  main().catch(errorHandler)
}
