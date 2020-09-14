import {
  BlockInfo,
  TxInfo,
  Msg,
  TxLog,
  MsgSend,
  MsgMultiSend,
  MsgSwap,
  MsgSwapSend,
  MsgExecuteContract,
} from '@terra-money/terra.js'
import * as bluebird from 'bluebird'
import { concat } from 'lodash'
import { getTxInfos } from '../block/blockInfo'
import { parseTerraMsg } from './terra'
import { parseMirrorMsg } from './mirror'

async function parseMsg(txInfo: TxInfo, msg: Msg, log: TxLog): Promise<unknown[]> {
  if (
    msg instanceof MsgSend ||
    msg instanceof MsgMultiSend ||
    msg instanceof MsgSwap ||
    msg instanceof MsgSwapSend
  ) {
    return parseTerraMsg(txInfo, msg, log)
  } else if (msg instanceof MsgExecuteContract) {
    return parseMirrorMsg(txInfo, msg, log)
  }
}

async function parseTransaction(txInfo: TxInfo): Promise<unknown[]> {
  const entities = []
  return concat(
    entities,
    ...(await bluebird.mapSeries(txInfo.tx.msg, (msg, index) =>
      parseMsg(txInfo, msg, txInfo.logs[index])
    ))
  )
}

export async function parseBlock(blockInfo: BlockInfo): Promise<unknown[]> {
  const entities = []
  return concat(
    entities,
    ...(await bluebird.mapSeries(getTxInfos(blockInfo), (txInfo) => parseTransaction(txInfo)))
  )
}
