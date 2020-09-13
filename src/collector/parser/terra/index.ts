import { TxInfo, TxLog, MsgSend, MsgMultiSend, MsgSwap, MsgSwapSend } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'

export async function parseTerraMsg(
  entityManager: EntityManager,
  txInfo: TxInfo,
  msg: MsgSend | MsgMultiSend | MsgSwap | MsgSwapSend,
  log: TxLog
): Promise<void> {
  //
}
