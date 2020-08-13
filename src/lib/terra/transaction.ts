import { Wallet, Msg, TxInfo } from '@terra-money/terra.js'
import { delay } from 'bluebird'
import { lcd } from '.'

async function checkTx(txHash: string, timeout = 120000): Promise<TxInfo> {
  const startedAt = Date.now()

  for (;;) {
    const txInfo = await lcd.tx.txInfo(txHash).catch(() => undefined)

    if (txInfo) {
      return txInfo
    }

    if (Date.now() - startedAt > timeout) {
      throw new Error('lcd timeout')
    }

    await delay(1000)
  }
}

export async function transaction(wallet: Wallet, msgs: Msg[], timeout = 60000): Promise<TxInfo> {
  return wallet
    .createAndSignTx({ msgs })
    .then((signed) => lcd.tx.broadcast(signed))
    .then(async (broadcastResult) => await checkTx(broadcastResult.txhash, timeout))
}
