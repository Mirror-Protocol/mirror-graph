import * as bluebird from 'bluebird'
import { TxWallet } from 'lib/terra'
import { errorHandler } from 'lib/error'
import { sendSlack } from 'lib/slack'
import {
  distributeRewards, updateCdps, updatePolls, adjust, updateNews
} from './jobs'

function errorHandleWithSlack(error?: object): void {
  if (error) {
    error['message'] && sendSlack('mirror-bot', error['message'])

    errorHandler(error)
  }
}

async function tick(now: number, wallet: TxWallet): Promise<void> {
  await distributeRewards(wallet).catch(errorHandleWithSlack)

  await updateNews().catch(errorHandleWithSlack)

  await updateCdps().catch(errorHandleWithSlack)

  await updatePolls(wallet).catch(errorHandleWithSlack)

  await adjust().catch(errorHandleWithSlack)
}

export async function loop(wallet: TxWallet): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await tick(Date.now(), wallet)

    await bluebird.delay(100)
  }
}
