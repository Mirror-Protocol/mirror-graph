import 'reflect-metadata'
import * as Bluebird from 'bluebird'
import * as config from 'config'
import { Container } from 'typedi'
import { once } from 'lodash'
import * as logger from 'lib/logger'
import { init as initErrorHandler, errorHandler } from 'error'
import { initORM, finalizeORM } from 'orm'
import { initServer, finalizeServer } from 'loaders'

Bluebird.config({ longStackTraces: true, warnings: { wForgottenReturn: false } })
global.Promise = Bluebird as any // eslint-disable-line

async function gracefulShutdown(): Promise<void> {
  // Docker will stop to direct traffic 10 seconds after stop signal
  logger.info('Shutdown procedure started')
  await Bluebird.delay(+process.env.SHUTDOWNTIMEOUT ?? 10000)

  // Stop accepting new connection
  logger.info('Closing listening port')
  await finalizeServer()
  await Bluebird.delay(+process.env.SHUTDOWNTIMEOUT ?? 30000)

  // Close db connections
  logger.info('Closing db connection')
  await finalizeORM()

  logger.info('Finished')
  process.exit(0)
}

async function main(): Promise<void> {
  logger.info('Initialize mirror-api-server')

  initErrorHandler({ sentry: config.sentry })

  await initORM(Container)
  await initServer()

  // attach graceful shutdown
  const signals = ['SIGHUP', 'SIGINT', 'SIGTERM'] as const
  signals.forEach((signal) => process.on(signal, once(gracefulShutdown)))
}

if (require.main === module) {
  main().catch(errorHandler)
}
