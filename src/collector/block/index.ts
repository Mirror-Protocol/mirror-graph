import { updateBlockHeight } from './blockInfo'
import { parseMsgs } from '../parser'

export async function tick(now: number): Promise<void> {
  const { isBlockUpdated, blockInfo } = await updateBlockHeight()
  if (!isBlockUpdated) {
    return
  }

  await parseMsgs(blockInfo)
}
