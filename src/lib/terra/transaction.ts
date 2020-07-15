import { Wallet, Msg } from '@terra-money/terra.js'
import { BlockTxBroadcastResult } from '@terra-money/terra.js/dist/client/lcd/api/TxAPI'
import { lcd } from '.'

export async function transaction(wallet: Wallet, msgs: Msg[]): Promise<BlockTxBroadcastResult> {
  // const unsignedTx = await wallet.createTx({ msgs, fee: new StdFee(0, { uluna: 1000 }) })
  // const fee = await lcd.tx.estimateFee(unsignedTx, {
  //   gasPrices: { uluna: '0.015' },
  //   gasAdjustment: 1.4,
  // })

  return wallet.createAndSignTx({ msgs }).then((signed) => lcd.tx.broadcast(signed))
}
