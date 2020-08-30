import * as Bluebird from 'bluebird'
import { BlockInfo, Msg, TxInfo } from '@terra-money/terra.js'
import { concat } from 'lodash'
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
  return Bluebird.map(getTxHashs(blockInfo), checkTx).filter((txInfo) => txInfo && !txInfo.code)
}

// get transaction msgs from blockInfo
export async function getTxMsgs(blockInfo: BlockInfo): Promise<Msg[]> {
  return concat(...(await getTxInfos(blockInfo)).map((txInfo) => txInfo.tx.msg))
  // const msgs = []

  // for (const txHash of getTxHashs(blockInfo)) {
  //   const txInfo = await checkTx(txHash)
  //   if (!txInfo || txInfo.code) {
  //     continue
  //   }

  //   msgs.push(...txInfo.tx.msg)
  // }

  // return msgs
}
