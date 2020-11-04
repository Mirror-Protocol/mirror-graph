import * as nodeCron from 'node-cron'
import { TxWallet } from 'lib/terra'
import { getKey } from 'lib/keystore'
import { errorHandler } from 'lib/error'
import { sendSlack } from 'lib/slack'
import config from 'config'
import { distributeRewards, updateCdps, updatePolls, adjust, updateNews } from './jobs'

export function errorHandleWithSlack(error?: object): void {
  if (error) {
    error['message'] && sendSlack('mirror-bot', error['message'])

    errorHandler(error)
  }
}

export function createJobs(botPassword: string): void {
  const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.KEYSTORE_BOT_KEY, botPassword))

  // node cron schedule option
  // second(option) min hour dayofmonth month dayofweek

  // every 1hour
  nodeCron.schedule('0 * * * *', async () => {
    await distributeRewards(wallet).catch(errorHandleWithSlack)
    await updateNews().catch(errorHandleWithSlack)
  })

  // every 1minute
  nodeCron.schedule('*/1 * * * *', async () => {
    await updateCdps().catch(errorHandleWithSlack)
  })

  // every 5minutes
  nodeCron.schedule('*/5 * * * *', async () => {
    await updatePolls(wallet).catch(errorHandleWithSlack)
    await adjust().catch(errorHandleWithSlack)
  })
}
