import 'reflect-metadata'
import * as Bluebird from 'bluebird'
import { Container } from 'typedi'
import { initORM } from 'orm'
import { init as initErrorHandler, errorHandler } from 'error'
import { ContractService } from 'services'
import * as logger from 'lib/logger'
import config from 'config'
import { initTerra } from 'lib/terra'

Bluebird.config({ longStackTraces: true, warnings: { wForgottenReturn: false } })
global.Promise = Bluebird as any // eslint-disable-line

async function storeCodes(): Promise<void> {
  const contractService = Container.get(ContractService)
  await contractService.storeCodes()
}

async function create(): Promise<void> {
  const contractService = Container.get(ContractService)
  logger.info(await contractService.create())
}

async function main(): Promise<void> {
  logger.info('initialize worker')

  initErrorHandler({ sentryDsn: config.SENTRY_DSN })

  await initORM(Container)

  initTerra(config.TERRA_LCD, config.TERRA_CHAINID)

  if (process.argv.length < 3) {
    throw new Error('argument is required')
  }

  const args = process.argv.slice(2)
  switch (args[0]) {
    case 'store-codes':
      await storeCodes()
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
