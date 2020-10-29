import * as nodeCron from 'node-cron'
import { TxWallet } from 'lib/terra'
import { getKey } from 'lib/keystore'
import { errorHandler } from 'lib/error'
import config from 'config'
import { distributeRewards, updateCdps, updatePolls, adjust, updateNews } from './jobs'

// node cron schedule option
// second(option) min hour dayofmonth month dayofweek

export function createJobs(botPassword: string): void {
  const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.KEYSTORE_BOT_KEY, botPassword))

  // every 1hour
  nodeCron.schedule('0 * * * *', async () => {
    await distributeRewards(wallet).catch(errorHandler)
    await updateNews().catch(errorHandler)
  })

  // every 1minute
  nodeCron.schedule('*/1 * * * *', async () => {
    await updateCdps().catch(errorHandler)
  })

  // every 5minutes
  nodeCron.schedule('*/5 * * * *', async () => {
    await updatePolls(wallet).catch(errorHandler)
    await adjust().catch(errorHandler)
  })
}
