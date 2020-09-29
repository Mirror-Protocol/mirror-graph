import { getRepository } from 'typeorm'
import { BlockEntity } from 'orm'
import config from 'config'

let collectedHeight

export async function getLastBlockFromDB(): Promise<BlockEntity> {
  return getRepository(BlockEntity)
      .findOne({ chainId: config.TERRA_CHAIN_ID }, { order: { id: 'DESC' } })
}

export async function getCollectedHeight(): Promise<number> {
  if (!collectedHeight) {
    const latestBlockFromDB = await getLastBlockFromDB()
    collectedHeight = latestBlockFromDB?.height || 29400
  }

  return collectedHeight
}

export function updateCollectedHeight(height: number): void {
  collectedHeight = height
}

export async function updateBlock(height: number): Promise<BlockEntity> {
  const block = await getLastBlockFromDB() || new BlockEntity()
  block.chainId = config.TERRA_CHAIN_ID
  block.height = height

  return block
}
