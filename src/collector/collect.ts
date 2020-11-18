import * as bluebird from 'bluebird'
import { formatToTimeZone } from 'date-fns-timezone'
import { getManager, EntityManager } from 'typeorm'
import { getLatestBlockHeight, getTxs } from 'lib/terra'
import * as logger from 'lib/logger'
import { errorHandler } from 'lib/error'
import { BlockEntity } from 'orm'
import { parseTxs } from './parser'
import { getCollectedBlock, updateBlock } from './block'
import config from 'config'

export async function collect(now: number): Promise<void> {
  const latestHeight = await getLatestBlockHeight().catch(async (error) => {
    errorHandler(error)
    await bluebird.delay(5000)
  })
  const collectedBlock = await getCollectedBlock().catch(errorHandler)
  if (!latestHeight || !collectedBlock || collectedBlock.height >= latestHeight) {
    return
  }
  const collectedHeight = collectedBlock.height

  logger.info(`collecting ${collectedHeight + 1}-${latestHeight}`)
  const txs = await getTxs(collectedHeight + 1, latestHeight, 1).catch(errorHandler)
  logger.info(`txs ${txs ? txs.length : 0}`)
  if (!txs) {
    return
  }

  if (txs.length < 1) {
    logger.info(`collected: ${config.TERRA_CHAIN_ID}, ${collectedHeight + 1}-${latestHeight}, 0 txs`)
    await updateBlock(collectedBlock, latestHeight)
    return
  }

  const lastTx = txs[txs.length - 1]

  await getManager().transaction(async (manager: EntityManager) => {
    await parseTxs(manager, txs)

    await updateBlock(collectedBlock, lastTx.height, manager.getRepository(BlockEntity))
  })

  const txDate = formatToTimeZone(
    new Date(lastTx.timestamp), 'YYYY-MM-DD HH:mm:ss', { timeZone: 'Asia/Seoul' }
  )

  logger.info(
    `collected: ${config.TERRA_CHAIN_ID}, ${collectedHeight + 1}-${lastTx.height},`,
    `${txDate}, ${txs.length} txs`
  )
}
