import 'reflect-metadata'
import * as Bluebird from 'bluebird'
import { Container } from 'typedi'
import { initORM } from 'orm'
import { init as initErrorHandler, errorHandler } from 'error'
import { ProgramService } from 'services'
import * as logger from 'lib/logger'
import config from 'config'
// import { MinterService } from 'services/MinterService'

Bluebird.config({ longStackTraces: true, warnings: { wForgottenReturn: false } })
global.Promise = Bluebird as any // eslint-disable-line

async function loadPrograms(): Promise<void> {
  const programService = Container.get(ProgramService)
  const program = await programService.loadProgram()

  logger.info(`loaded mirror programs to solana. id: ${program.id}`)
}

async function create(): Promise<void> {
  const programService = Container.get(ProgramService)

  logger.info(await programService.create())
}

async function main(): Promise<void> {
  logger.info('initialize worker')

  initErrorHandler({ sentryDsn: config.SENTRY_DSN })

  await initORM(Container)

  const args = process.argv.slice(2)
  switch (args[0]) {
    case 'load-programs':
      await loadPrograms()
      break

    case 'create':
      await create()
      break

    default:
      break
  }
}

if (require.main === module) {
  main().catch(errorHandler)
}
