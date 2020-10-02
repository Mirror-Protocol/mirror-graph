import { format } from 'date-fns'
import { getManager, EntityManager } from 'typeorm'
import { getLatestBlockHeight, getTxs } from 'lib/terra'
import * as logger from 'lib/logger'
import { parseTxs } from './parser'
import { getCollectedHeight, updateBlock } from './block'
import config from 'config'

export async function collect(now: number): Promise<void> {
  const latestHeight = await getLatestBlockHeight()
  const collectedHeight = await getCollectedHeight()
  if (!latestHeight || collectedHeight >= latestHeight) {
    return
  }

  // logger.info(`collecting ${collectedHeight + 1}-${Math.min(collectedHeight + 1 + 1000, latestHeight)}`)
  // get last collected ~ latest txs, limit 1000
  const txs = await getTxs(collectedHeight + 1, latestHeight, 500)
  if (!txs || txs.length < 1) {
    return
  }
  const lastTx = txs[txs.length - 1]

  return getManager()
    .transaction(async (manager: EntityManager) => {
      await parseTxs(manager, txs)

      await manager.save(await updateBlock(lastTx.height))
    })
    .then(() => {
      logger.info(
        `collected: ${config.TERRA_CHAIN_ID}, ${collectedHeight + 1}-${lastTx.height},`,
        `${format(new Date(lastTx.timestamp), 'yyyy-MM-dd HH:mm:ss')}, ${txs.length} txs`
      )
    })
}
