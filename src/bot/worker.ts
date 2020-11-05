import * as bluebird from 'bluebird'
import { TxWallet } from 'lib/terra'
import { errorHandler as errorHandleWithSentry } from 'lib/error'
import { sendSlack } from 'lib/slack'
import {
  distributeRewards, updateCdps, updatePolls, adjust, updateNews
} from './jobs'

function errorHandler(job: string, error?: object): void {
  if (error) {
    if (error['message']) {
      sendSlack('mirror-bot', `${job} failed: ${error['message']}`)
    } else if(error['response'] && error['response'].errors) {
      sendSlack('mirror-bot', `${job} failed: ${JSON.stringify(error['response'].errors)}`)
    }

    errorHandleWithSentry(error)
  }
}

async function tick(now: number, wallet: TxWallet): Promise<void> {
  await distributeRewards(wallet)
    .catch((error) => errorHandler('distributeRewards', error))

  await updateNews().catch((error) => errorHandler('updateNews', error))

  await updateCdps().catch((error) => errorHandler('updateCdps', error))

  await updatePolls(wallet).catch((error) => errorHandler('updatePolls', error))

  await adjust().catch((error) => errorHandler('adjest', error))
}

export async function loop(wallet: TxWallet): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await tick(Date.now(), wallet)

    await bluebird.delay(100)
  }
}
