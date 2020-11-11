import { getRepository } from 'typeorm'
import { BlockEntity } from 'orm'
import config from 'config'

export async function getLastBlockFromDB(): Promise<BlockEntity> {
  return getRepository(BlockEntity).findOne(
    { chainId: config.TERRA_CHAIN_ID },
    { order: { id: 'DESC' } }
  )
}

export async function getCollectedBlock(): Promise<BlockEntity> {
  const latestBlockFromDB = await getLastBlockFromDB()
  return latestBlockFromDB || new BlockEntity({
    chainId: config.TERRA_CHAIN_ID,
    height: config.START_BLOCK_HEIGHT,
  })
}

export async function updateBlock(
  block: BlockEntity, height: number, repo = getRepository(BlockEntity)
): Promise<BlockEntity> {
  block.height = height

  return repo.save(block)
}
