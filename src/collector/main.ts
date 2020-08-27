import 'reflect-metadata'
import * as Bluebird from 'bluebird'
import { Container } from 'typedi'
import { initORM } from 'orm'
import { init as initErrorHandler, errorHandler } from 'error'
import { initMirror } from 'loaders'
import * as logger from 'lib/logger'
import { validateConfig } from 'config'
import { tick } from './block'

Bluebird.config({ longStackTraces: true, warnings: { wForgottenReturn: false } })
global.Promise = Bluebird as any // eslint-disable-line

async function loop(): Promise<void> {
  for (;;) {
    const now = Date.now()

    await tick(now).catch(errorHandler)

    await Bluebird.delay(100)
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
