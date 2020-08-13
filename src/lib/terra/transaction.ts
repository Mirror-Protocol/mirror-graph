import { Wallet, Msg, TxInfo } from '@terra-money/terra.js'
import { delay } from 'bluebird'
import { lcd } from '.'

async function checkTx(txHash: string): Promise<TxInfo> {
  for (let counter = 0; counter < 30; counter += 1) {
    const txInfo = await lcd.tx.txInfo(txHash).catch(() => undefined)

    if (txInfo) {
      return txInfo
    }

    await delay(1000)
  }

  throw new Error('lcd timeout')
}

export async function transaction(wallet: Wallet, msgs: Msg[]): Promise<TxInfo> {
  return wallet
    .createAndSignTx({ msgs })
    .then((signed) => lcd.tx.broadcast(signed))
    .then(async (broadcastResult) => await checkTx(broadcastResult.txhash))
}
