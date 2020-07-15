import 'reflect-metadata'
import * as Bluebird from 'bluebird'
import { Container } from 'typedi'
import { program } from 'commander'
import { values } from 'lodash'
import { initORM } from 'orm'
import { init as initErrorHandler, errorHandler } from 'error'
import * as logger from 'lib/logger'
import config from 'config'
import { initTerra } from 'lib/terra'
import * as commands from './commands'

Bluebird.config({ longStackTraces: true, warnings: { wForgottenReturn: false } })
global.Promise = Bluebird as any // eslint-disable-line

async function main(): Promise<void> {
  logger.info('initialize worker')

  initErrorHandler({ sentryDsn: config.SENTRY_DSN })

  await initORM(Container)

  initTerra(config.TERRA_LCD, config.TERRA_CHAINID)

  // regist commands
  values(commands).forEach((func) => func())

  program.version('0.0.1').parse(process.argv)
}

if (require.main === module) {
  main().catch(errorHandler)
}
