import { BlockInfo } from '@terra-money/terra.js'
import * as sentry from '@sentry/node'
import { getManager, EntityManager, getRepository } from 'typeorm'
import { BlockEntity } from 'orm'
import { lcd } from 'lib/terra'
import * as logger from 'lib/logger'
import { getTxHashs } from './blockInfo'
import { parseTransactions } from './parser'

let lastBlockHeight

async function getLastBlockHeight(): Promise<number> {
  if (!lastBlockHeight) {
    const latestBlockFromDB = await getRepository(BlockEntity).findOne({ order: { id: 'DESC' } })
    lastBlockHeight = latestBlockFromDB?.height || 0
  }

  return lastBlockHeight
}

async function saveBlock(entityManager: EntityManager, blockInfo: BlockInfo): Promise<BlockEntity> {
  const block: Partial<BlockEntity> = {
    chainId: blockInfo.block.header.chain_id,
    height: +blockInfo.block.header.height,
    datetime: new Date(blockInfo.block.header.time),
    txs: getTxHashs(blockInfo),
  }

  return entityManager.getRepository(BlockEntity).save(block)
}

export async function updateBlock(): Promise<boolean> {
  const blockInfo = await lcd.tendermint
    .blockInfo((await getLastBlockHeight()) + 1)
    .catch(undefined)
  // const blockInfo = await lcd.tendermint
  //   .blockInfo(lastBlockHeight ? lastBlockHeight + 1 : undefined)
  //   .catch((error) => undefined)

  // has no more block
  if (!blockInfo) {
    return false
  }

  return getManager()
    .transaction(async (entityManager: EntityManager) => {
      await saveBlock(entityManager, blockInfo)
      await parseTransactions(entityManager, blockInfo)
    })
    .then(() => {
      lastBlockHeight = +blockInfo.block.header.height
      return true
    })
    .catch((error) => {
      sentry.captureException(error)
      logger.error(error)
      return false
    })
}
