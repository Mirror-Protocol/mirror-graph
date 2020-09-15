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
import { errorHandler } from 'lib/error'
import { getTxInfos } from '../block/blockInfo'
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

async function parseTransaction(txInfo: TxInfo): Promise<unknown[]> {
  const entities = []
  return concat(
    entities,
    ...(await bluebird.mapSeries(txInfo.tx.msg, (msg, index) =>
      parseMsg(txInfo, msg, index, txInfo.logs[index])
        .catch((error) => {
          errorHandler(error)
          return []
        })
    ))
  )
}

export async function parseBlock(blockInfo: BlockInfo): Promise<unknown[]> {
  const entities = []
  return concat(
    entities,
    ...(await bluebird.map(getTxInfos(blockInfo), (txInfo) => parseTransaction(txInfo)))
  )
}
