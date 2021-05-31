import { lcd } from './lcd'

export class BlockUpdater {
  private lastBlockHeight = -1

  async updateBlockHeight(): Promise<{
    isBlockUpdated: boolean
    lastBlockHeight: number
  }> {
    const blockInfo = await lcd.tendermint.blockInfo()
    const currentBlockHeight = +blockInfo.block.header.height

    const isBlockUpdated = currentBlockHeight > this.lastBlockHeight
    if (isBlockUpdated) {
      this.lastBlockHeight = currentBlockHeight
    }

    return { isBlockUpdated, lastBlockHeight: this.lastBlockHeight }
  }
}
