import { BlockInfo, Msg } from '@terra-money/terra.js'
import * as crypto from 'crypto'
import { lcd, checkTx } from 'lib/terra'

let lastBlockHeight = -1

export async function updateBlockHeight(): Promise<{
  isBlockUpdated: boolean
  lastBlockHeight: number
  blockInfo: BlockInfo
}> {
  const blockInfo: BlockInfo = await lcd.tendermint.blockInfo()

  const currentBlockHeight = +blockInfo.block.header.height

  const isBlockUpdated = currentBlockHeight !== lastBlockHeight
  if (isBlockUpdated) {
    lastBlockHeight = currentBlockHeight
  }

  return { isBlockUpdated, lastBlockHeight, blockInfo }
}

function decryptTxHash(txstring: string): string {
  const s256Buffer = crypto.createHash(`sha256`).update(Buffer.from(txstring, `base64`)).digest()
  const txbytes = new Uint8Array(s256Buffer)

  return Buffer.from(txbytes.slice(0, 32)).toString(`hex`)
}

// get transaction hash strings from blockInfo
export function getTxHashs(blockInfo: BlockInfo): string[] {
  return blockInfo?.block?.data?.txs?.map(decryptTxHash) || []
}

// get transaction msgs from blockInfo
export async function getTxMsgs(blockInfo: BlockInfo): Promise<Msg[]> {
  const msgs = []

  const start = Date.now()
  for (const txHash of getTxHashs(blockInfo)) {
    const txInfo = await checkTx(txHash)
    if (!txInfo || txInfo.code) {
      continue
    }

    msgs.push(...txInfo.tx.msg)
  }
  const end = Date.now()
  console.log('getTxMsgs', end - start)

  return msgs
}
