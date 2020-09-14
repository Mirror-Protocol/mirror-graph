import { TxInfo, TxLog, MsgSend, MsgMultiSend, MsgSwap, MsgSwapSend } from '@terra-money/terra.js'

export async function parseTerraMsg(
  txInfo: TxInfo,
  msg: MsgSend | MsgMultiSend | MsgSwap | MsgSwapSend,
  log: TxLog
): Promise<unknown[]> {
  return []
}
