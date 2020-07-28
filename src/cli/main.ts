import 'reflect-metadata'
import * as Bluebird from 'bluebird'
import { Container } from 'typedi'
import { program } from 'commander'
import { values } from 'lodash'
import { initORM } from 'orm'
import { init as initErrorHandler, errorHandler } from 'error'
import { initMirror } from 'loaders'
import * as logger from 'lib/logger'
import config, { validateConfig } from 'config'
import * as commands from './commands'

Bluebird.config({ longStackTraces: true, warnings: { wForgottenReturn: false } })
global.Promise = Bluebird as any // eslint-disable-line

async function main(): Promise<void> {
  logger.info('initialize cli')

  initErrorHandler({ sentryDsn: config.SENTRY_DSN })

  validateConfig()

  await initORM(Container)

  await initMirror()

  // regist commands
  values(commands).forEach((func) => func())

  program.version('0.0.1').parse(process.argv)
}

if (require.main === module) {
  main().catch(errorHandler)
}
