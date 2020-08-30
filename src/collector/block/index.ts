import { updateBlock } from './update'

export async function collectBlock(now: number): Promise<void> {
  for (;;) {
    const hasMoreBlock = await updateBlock()

    if (!hasMoreBlock) {
      break
    }
  }
}
