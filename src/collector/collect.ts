import { format } from 'date-fns'
import { getManager, EntityManager } from 'typeorm'
import { statisticService } from 'services'
import { DailyStatisticEntity } from 'orm'
import { getLatestBlockHeight, getTxs } from 'lib/terra'
import * as logger from 'lib/logger'
import { parseTxs } from './parser'
import { getCollectedHeight, updateBlock } from './block'
import config from 'config'

let lastTick = 0

export async function collect(now: number): Promise<void> {
  const latestHeight = await getLatestBlockHeight()
  const collectedHeight = await getCollectedHeight()
  if (!latestHeight || collectedHeight >= latestHeight) {
    return
  }

  const txs = await getTxs(collectedHeight + 1, latestHeight, 500)
  if (!txs || txs.length < 1) {
    return
  }
  const firstTx = txs[0]
  const lastTx = txs[txs.length - 1]

  return getManager()
    .transaction(async (manager: EntityManager) => {
      await parseTxs(manager, txs)

      const lastTxTimestamp = new Date(lastTx.timestamp).getTime()
      if (lastTxTimestamp - lastTick > 180000) {
        const dailyStatRepo = manager.getRepository(DailyStatisticEntity)
        await statisticService().calculateDailyCumulativeLiquidity(lastTxTimestamp, dailyStatRepo)
        lastTick = lastTxTimestamp
      }

      await manager.save(await updateBlock(lastTx.height))
    })
    .then(() => {
      logger.info(
        `collected: ${config.TERRA_CHAIN_ID}, ${firstTx.height}-${lastTx.height},`,
        `${format(new Date(lastTx.timestamp), 'yyyy-MM-dd HH:mm:ss')}, ${txs.length} txs`
      )
    })
}
