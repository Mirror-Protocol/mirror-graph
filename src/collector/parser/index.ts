import {
  TxInfo, Msg, TxLog, MsgSend, MsgMultiSend, MsgSwap, MsgSwapSend, MsgExecuteContract
} from '@terra-money/terra.js'
import * as bluebird from 'bluebird'
import { parseTerraMsg } from './terra'
import { parseMirrorMsg } from './mirror'

async function parseMsg(txInfo: TxInfo, msg: Msg, msgIndex: number, log: TxLog): Promise<unknown[]> {
  if (
    msg instanceof MsgSend ||
    msg instanceof MsgMultiSend ||
    msg instanceof MsgSwap ||
    msg instanceof MsgSwapSend
  ) {
    return parseTerraMsg(txInfo, msg, msgIndex, log)
  } else if (msg instanceof MsgExecuteContract) {
    return parseMirrorMsg(txInfo, msg, msgIndex, log)
  }

  return []
}

export async function parseTxs(txs: TxInfo[]): Promise<unknown[]> {
  const entities = []

  await bluebird.mapSeries(txs, async (txInfo) => {
    await bluebird.mapSeries(txInfo.tx.msg, async (msg, index) => {
      entities.push(...await parseMsg(txInfo, msg, index, txInfo.logs[index]))
    })
  })

  return entities
}
