import 'reflect-metadata'
import { program } from 'commander'
import * as promptly from 'promptly'
import * as bluebird from 'bluebird'
import { Container } from 'typedi'
import { initORM } from 'orm'
import { init as initErrorHandler, errorHandler } from 'lib/error'
import * as logger from 'lib/logger'
import { initMirror } from 'loaders'
import { TxWallet } from 'lib/terra'
import { getKey } from 'lib/keystore'
import config, { validateConfig } from 'config'
import { loop } from './worker'

bluebird.config({ longStackTraces: true, warnings: { wForgottenReturn: false } })
global.Promise = bluebird as any // eslint-disable-line

async function main(): Promise<void> {
  logger.info('initialize bot')

  initErrorHandler({ sentryDsn: process.env.SENTRY_BOT })

  validateConfig()

  await initORM(Container)

  await initMirror()

  program.action(async (options) => {
    const password =
      config.KEYSTORE_BOT_PASSWORD ||
      (await promptly.password(`Enter bot passphrase:`, { replace: `*` }))
    if (!password) {
      throw new Error('bot password is missing')
    }
    const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.KEYSTORE_BOT_KEY, password))

    await loop(wallet)
  })

  await program.parseAsync(process.argv)
}

if (require.main === module) {
  main().catch(errorHandler)
}
