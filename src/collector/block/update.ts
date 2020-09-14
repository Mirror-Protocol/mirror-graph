import { BlockInfo } from '@terra-money/terra.js'
import * as sentry from '@sentry/node'
import { format } from 'date-fns'
import { getManager, EntityManager, getRepository } from 'typeorm'
import { BlockEntity } from 'orm'
import { lcd } from 'lib/terra'
import * as logger from 'lib/logger'
import { getTxHashs } from './blockInfo'
import { parseBlock } from '../parser'

let lastBlockHeight

async function getNewBlockHeight(): Promise<number> {
  if (!lastBlockHeight) {
    return undefined
    // return (await lcd.tendermint.blockInfo(await getNewBlockHeight())).block.header.height

    const latestBlockFromDB = await getRepository(BlockEntity).findOne({ order: { id: 'DESC' } })
    lastBlockHeight = latestBlockFromDB?.height || 0
  }

  return lastBlockHeight + 1
}

async function saveBlock(manager: EntityManager, blockInfo: BlockInfo): Promise<BlockEntity> {
  return manager.getRepository(BlockEntity).save({
    chainId: blockInfo.block.header.chain_id,
    height: +blockInfo.block.header.height,
    datetime: new Date(blockInfo.block.header.time),
    txs: getTxHashs(blockInfo),
  })
}

export async function updateBlock(): Promise<boolean> {
  const blockInfo: BlockInfo = await lcd.tendermint
    .blockInfo(await getNewBlockHeight())
    .catch((error) => undefined)

  // has no more block
  if (!blockInfo) {
    return false
  }

  return getManager()
    .transaction(async (manager: EntityManager) => {
      await saveBlock(manager, blockInfo)

      const entities = await parseBlock(blockInfo)
      await manager.save(entities)
    })
    .then(() => {
      lastBlockHeight = +blockInfo.block.header.height

      const { chain_id: chainId, time } = blockInfo.block.header
      const txs = blockInfo.block.data.txs?.length || 0
      logger.info(
        `collected: ${chainId}, ${lastBlockHeight},`,
        `${format(new Date(time), 'yyyy-MM-dd HH:mm:ss')}, ${txs} txs`
      )
      return true
    })
    .catch((error) => {
      sentry.captureException(error)
      logger.error(error)
      throw new Error(error)
      return false
    })
}
