import { Wallet, Msg } from '@terra-money/terra.js'
import { BlockTxBroadcastResult } from '@terra-money/terra.js/dist/client/lcd/api/TxAPI'
import { lcd } from '.'

export async function transaction(wallet: Wallet, msgs: Msg[]): Promise<BlockTxBroadcastResult> {
  return wallet.createAndSignTx({ msgs }).then((signed) => lcd.tx.broadcast(signed))
}
