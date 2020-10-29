import 'reflect-metadata'
import { program } from 'commander'
import * as promptly from 'promptly'
import * as bluebird from 'bluebird'
import { Container } from 'typedi'
import { initORM } from 'orm'
import { init as initErrorHandler, errorHandler } from 'lib/error'
import * as logger from 'lib/logger'
import { initMirror } from 'loaders'
import config, { validateConfig } from 'config'
import { createJobs } from './createJobs'

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

    await createJobs(password)
  })

  await program.parseAsync(process.argv)
}

if (require.main === module) {
  main().catch(errorHandler)
}
