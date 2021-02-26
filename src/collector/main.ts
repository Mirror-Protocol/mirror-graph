import 'reflect-metadata'
import * as bluebird from 'bluebird'
import { Container } from 'typedi'
import { initORM } from 'orm'
import { init as initErrorHandler, errorHandler } from 'lib/error'
import * as logger from 'lib/logger'
import { sendSlack } from 'lib/slack'
import { initMirror } from 'loaders'
import { validateConfig } from 'config'
import { collect } from './collect'
import config from 'config'

bluebird.config({ longStackTraces: true, warnings: { wForgottenReturn: false } })
global.Promise = bluebird as any // eslint-disable-line

async function loop(): Promise<void> {
  for (;;) {
    const now = Date.now()

    await collect(now)

    await bluebird.delay(200)
  }
}

async function main(): Promise<void> {
  logger.info(`initialize collector, start_block_height: ${config.START_BLOCK_HEIGHT}`)

  initErrorHandler({ sentryDsn: process.env.SENTRY_COLLECTOR })

  validateConfig()

  await initORM(Container)

  logger.info('initialize mirror')
  await initMirror()

  logger.info('start collecting')
  await loop()
}

if (require.main === module) {
  main().catch((error) => {
    error['message'] && sendSlack('mirror-collector', error['message'])

    errorHandler(error)
  })
}
