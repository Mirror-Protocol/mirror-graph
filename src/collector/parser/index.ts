import {
  TxInfo, Msg, TxLog, MsgSend, MsgMultiSend, MsgSwap, MsgSwapSend, MsgExecuteContract
} from '@terra-money/terra.js'
import * as bluebird from 'bluebird'
import { EntityManager } from 'typeorm'
import { parseTerraMsg } from './terra'
import { parseMirrorMsg } from './mirror'

async function parseMsg(
  manager: EntityManager, txInfo: TxInfo, msg: Msg, log: TxLog
): Promise<void> {
  if (
    msg instanceof MsgSend ||
    msg instanceof MsgMultiSend ||
    msg instanceof MsgSwap ||
    msg instanceof MsgSwapSend
  ) {
    return parseTerraMsg(manager, txInfo, msg, log)
  } else if (msg instanceof MsgExecuteContract) {
    return parseMirrorMsg(manager, txInfo, msg, log)
  }
}

export async function parseTxs(
  manager: EntityManager, txs: TxInfo[]
): Promise<void> {
  await bluebird.mapSeries(txs, async (txInfo) => {
    await bluebird.mapSeries(txInfo.tx.msg, async (msg, index) => {
      await parseMsg(manager, txInfo, msg, txInfo.logs[index])
    })
  })
}
