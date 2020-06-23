import 'reflect-metadata'
import * as Bluebird from 'bluebird'
import { Container } from 'typedi'
import { initORM } from 'orm'
import { init as initErrorHandler, errorHandler } from 'error'
import { ProgramService, MinterService } from 'services'
import * as logger from 'lib/logger'
import config from 'config'

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

async function whitelisting(symbol: string): Promise<void> {
  const minterService = Container.get(MinterService)
  await minterService.whitelisting(symbol)
}

async function deposit(symbol: string): Promise<void> {
  const minterService = Container.get(MinterService)
  await minterService.deposit(symbol)
}

async function board(symbol: string): Promise<void> {
  const minterService = Container.get(MinterService)
  await minterService.boardInfo(symbol)
}

async function main(): Promise<void> {
  logger.info('initialize worker')

  initErrorHandler({ sentryDsn: config.SENTRY_DSN })

  await initORM(Container)

  if (process.argv.length < 3) {
    throw new Error('argument is required')
  }

  const args = process.argv.slice(2)
  switch (args[0]) {
    case 'load-programs':
      await loadPrograms()
      break

    case 'create':
      await create()
      break

    case 'whitelisting':
      if (args.length < 2) {
        throw new Error('input symbol argument')
      }
      await whitelisting(args[1])
      break

    case 'deposit':
      if (args.length < 2) {
        throw new Error('input symbol argument')
      }
      await deposit(args[1])
      break

    case 'board':
      if (args.length < 2) {
        throw new Error('input symbol argument')
      }
      await board(args[1])
      break

    default:
      break
  }
}

if (require.main === module) {
  main().catch(errorHandler)
}
