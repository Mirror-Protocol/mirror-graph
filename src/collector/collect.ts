import { format } from 'date-fns'
import { getManager, EntityManager } from 'typeorm'
import { getLatestBlockHeight, getTxs } from 'lib/terra'
import * as logger from 'lib/logger'
import { parseTxs } from './parser'
import { getCollectedHeight, updateCollectedHeight, updateBlock } from './block'
import config from 'config'

export async function collect(now: number): Promise<void> {
  const latestHeight = await getLatestBlockHeight()
  const collectedHeight = await getCollectedHeight()
  if (!latestHeight || collectedHeight >= latestHeight) {
    return
  }

  // get last collected ~ latest txs, limit 1000
  const txs = await getTxs(collectedHeight + 1, latestHeight, 1000)
  if (!txs || txs.length < 1) {
    return
  }
  const lastTx = txs[txs.length - 1]

  return getManager()
    .transaction(async (manager: EntityManager) => {
      const entities = await parseTxs(txs) || []
      entities.push(await updateBlock(lastTx.height))

      await manager.save(entities)
    })
    .then(() => {
      updateCollectedHeight(lastTx.height)

      logger.info(
        `collected: ${config.TERRA_CHAIN_ID}, ${collectedHeight + 1}-${lastTx.height},`,
        `${format(new Date(lastTx.timestamp), 'yyyy-MM-dd HH:mm:ss')}, ${txs.length} txs`
      )
    })
}
