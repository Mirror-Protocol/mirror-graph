import { TxInfo, TxLog, MsgSend, MsgMultiSend, MsgSwap, MsgSwapSend } from '@terra-money/terra.js'

type AllowMsgs = MsgSend | MsgMultiSend | MsgSwap | MsgSwapSend

export async function parseTerraMsg(
  txInfo: TxInfo, msg: AllowMsgs, log: TxLog
): Promise<unknown[]> {
  return []
}
