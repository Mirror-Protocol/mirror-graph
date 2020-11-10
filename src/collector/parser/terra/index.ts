import { TxInfo, TxLog, MsgSend, MsgMultiSend, MsgSwap, MsgSwapSend } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import * as send from './send'
import * as swap from './swap'
import * as swapSend from './swapSend'
import * as multiSend from './multiSend'

type AllowMsgs = MsgSend | MsgMultiSend | MsgSwap | MsgSwapSend

export async function parseTerraMsg(
  manager: EntityManager, txInfo: TxInfo, msg: AllowMsgs, log: TxLog
): Promise<void> {
  if (msg instanceof MsgSend) {
    return send.parse(manager, txInfo, log)
  } else if (msg instanceof MsgMultiSend) {
    return multiSend.parse(manager, txInfo, log)
  } else if (msg instanceof MsgSwap) {
    return swap.parse(manager, txInfo, msg, log)
  } else if (msg instanceof MsgSwapSend) {
    return swapSend.parse(manager, txInfo, msg, log)
  }
}
