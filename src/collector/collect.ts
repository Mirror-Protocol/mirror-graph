import { format } from 'date-fns'
import { getManager, EntityManager } from 'typeorm'
import { getLatestBlockHeight, getTxs } from 'lib/terra'
import * as logger from 'lib/logger'
import { errorHandler } from 'lib/error'
import { parseTxs } from './parser'
import { getCollectedHeight, updateBlock } from './block'
import config from 'config'

export async function collect(now: number): Promise<void> {
  const latestHeight = await getLatestBlockHeight().catch(errorHandler)
  const collectedHeight = await getCollectedHeight()
  if (!latestHeight || collectedHeight >= latestHeight) {
    return
  }

  const txs = await getTxs(collectedHeight + 1, latestHeight, 500).catch(errorHandler)
  if (!txs || txs.length < 1) {
    return
  }
  const firstTx = txs[0]
  const lastTx = txs[txs.length - 1]

  return getManager()
    .transaction(async (manager: EntityManager) => {
      await parseTxs(manager, txs)

      await manager.save(await updateBlock(lastTx.height))
    })
    .then(() => {
      logger.info(
        `collected: ${config.TERRA_CHAIN_ID}, ${firstTx.height}-${lastTx.height},`,
        `${format(new Date(lastTx.timestamp), 'yyyy-MM-dd HH:mm:ss')}, ${txs.length} txs`
      )
    })
}
