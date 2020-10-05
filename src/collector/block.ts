import { getRepository } from 'typeorm'
import { BlockEntity } from 'orm'
import config from 'config'

export async function getLastBlockFromDB(): Promise<BlockEntity> {
  return getRepository(BlockEntity)
      .findOne({ chainId: config.TERRA_CHAIN_ID }, { order: { id: 'DESC' } })
}

export async function getCollectedHeight(): Promise<number> {
  const latestBlockFromDB = await getLastBlockFromDB()
  return latestBlockFromDB?.height || 32000
}

export async function updateBlock(height: number): Promise<BlockEntity> {
  const block = await getLastBlockFromDB() || new BlockEntity()

  block.chainId = config.TERRA_CHAIN_ID
  block.height = height

  return block
}
