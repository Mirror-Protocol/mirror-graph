import { BlockInfo, MsgExecuteContract } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { AssetService, PriceService } from 'services'
import { OracleMsgExecute } from 'orm'
import * as logger from 'lib/logger'

export async function parseFeedPrice(blockInfo: BlockInfo, msg: MsgExecuteContract): Promise<void> {
  const oracleMsg = (msg as unknown) as OracleMsgExecute
  const assetService = Container.get(AssetService)
  const asset = await assetService.get({ oracle: oracleMsg.contract })
  if (!asset) {
    throw new Error(`unknown oracle contract: ${JSON.stringify(msg)}`)
  }

  const priceService = Container.get(PriceService)
  const { price } = oracleMsg.execute_msg.feed_price
  const blockTime = new Date(blockInfo.block.header.time).getTime()

  await priceService.setPrice(asset, blockTime, price)
  // console.log(format(new Date(blockInfo.block.header.time), 'yyyy-MM-dd HH:mm:ss'))
  logger.info(`${asset.symbol}: ${price}`)
}
