import { MsgExecuteContract, BlockInfo, TxInfo } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { getTxInfos } from '../blockInfo'
import { parseFeedPrice } from './oracle'

export async function parseTransactions(
  entityManager: EntityManager,
  blockInfo: BlockInfo
): Promise<void> {
  const txs: TxInfo[] = await getTxInfos(blockInfo)

  for (const txInfo of txs) {
    const msgs = txInfo.tx.msg.filter(
      (msg) => msg instanceof MsgExecuteContract
    ) as MsgExecuteContract[]

    for (const msg of msgs) {
      if (msg.execute_msg['feed_price']) {
        await parseFeedPrice(entityManager, txInfo, msg)
      }
    }
  }
}
