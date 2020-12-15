import {
  TxInfo, Msg, TxLog, MsgSend, MsgMultiSend, MsgSwap, MsgSwapSend, MsgExecuteContract
} from '@terra-money/terra.js'
import { isSameDay } from 'date-fns'
import * as bluebird from 'bluebird'
import { EntityManager } from 'typeorm'
import { statisticService } from 'services'
import { DailyStatisticEntity } from 'orm'
import { parseTerraMsg } from './terra'
import { parseMirrorMsg } from './mirror'

let lastTick = 0

async function parseMsg(
  manager: EntityManager, txInfo: TxInfo, msg: Msg, log: TxLog
): Promise<void> {
  if (msg instanceof MsgExecuteContract) {
    return parseMirrorMsg(manager, txInfo, msg, log)
  } else if (
    msg instanceof MsgSend ||
    msg instanceof MsgMultiSend ||
    msg instanceof MsgSwap ||
    msg instanceof MsgSwapSend
  ) {
    return parseTerraMsg(manager, txInfo, msg, log)
  }
}

async function txTick(manager: EntityManager, timestamp: number): Promise<void> {
  // 3minutes tick
  if (timestamp - lastTick > 180000) {
    const dailyStatRepo = manager.getRepository(DailyStatisticEntity)

    // calculate today's liquidity volume
    await statisticService().calculateDailyCumulativeLiquidity(timestamp, dailyStatRepo)

    if (!isSameDay(lastTick, timestamp)) {
      // calculate yesterday's liquidity volume finally
      await statisticService().calculateDailyCumulativeLiquidity(lastTick, dailyStatRepo)
    }
    lastTick = timestamp
  }
}

export async function parseTxs(manager: EntityManager, txs: TxInfo[]): Promise<void> {
  await bluebird.mapSeries(txs, async (txInfo) => {
    await bluebird.mapSeries(txInfo.tx.msg, async (msg, index) => {
      await parseMsg(manager, txInfo, msg, txInfo.logs[index])
    }).catch((error) => {
      if (error) {
        error['height'] = txInfo.height
        error['txHash'] = txInfo.txhash
      }
      throw error
    })

    await txTick(manager, new Date(txInfo.timestamp).getTime())
  })
}
