import * as bluebird from 'bluebird'
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
import { EntityManager } from 'typeorm'
import { getTxInfos } from '../block/blockInfo'
import { parseTerraMsg } from './terra'
import { parseMirrorMsg } from './mirror'

async function parseMsg(
  manager: EntityManager,
  txInfo: TxInfo,
  msg: Msg,
  log: TxLog
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

async function parseTransaction(manager: EntityManager, txInfo: TxInfo): Promise<void[]> {
  return bluebird.mapSeries(txInfo.tx.msg, (msg, index) =>
    parseMsg(manager, txInfo, msg, txInfo.logs[index])
  )
}

export async function parseBlock(
  entityManager: EntityManager,
  blockInfo: BlockInfo
): Promise<void> {
  await bluebird.mapSeries(getTxInfos(blockInfo), (txInfo) =>
    parseTransaction(entityManager, txInfo)
  )
}
