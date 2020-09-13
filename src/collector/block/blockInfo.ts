import { BlockInfo, TxInfo } from '@terra-money/terra.js'
import * as bluebird from 'bluebird'
import * as crypto from 'crypto'
import { checkTx } from 'lib/terra'

function decryptTxHash(txstring: string): string {
  const s256Buffer = crypto.createHash('sha256').update(Buffer.from(txstring, 'base64')).digest()
  const txbytes = new Uint8Array(s256Buffer)

  return Buffer.from(txbytes.slice(0, 32)).toString('hex')
}

// get transaction hash strings from blockInfo
export function getTxHashs(blockInfo: BlockInfo): string[] {
  return blockInfo?.block?.data?.txs?.map(decryptTxHash) || []
}

export async function getTxInfos(blockInfo: BlockInfo): Promise<TxInfo[]> {
  return bluebird
    .map(getTxHashs(blockInfo), (txHash) => checkTx(txHash))
    .filter((txInfo) => txInfo && !txInfo.code)
}
