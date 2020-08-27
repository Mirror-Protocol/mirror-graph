import { MsgExecuteContract, BlockInfo } from '@terra-money/terra.js'
import { getTxMsgs } from '../block/blockInfo'
import { parseFeedPrice } from './oracle'

export async function parseMsgs(blockInfo: BlockInfo): Promise<void> {
  const msgs: MsgExecuteContract[] = (await getTxMsgs(blockInfo)).filter(
    (msg) => msg instanceof MsgExecuteContract
  ) as MsgExecuteContract[]

  for (const msg of msgs) {
    if (msg.execute_msg['feed_price']) {
      await parseFeedPrice(blockInfo, msg)
    }
  }
}
