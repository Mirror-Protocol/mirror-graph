import { TxInfo, MsgExecuteContract } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { Container } from 'typedi'
import { AssetService, PriceService } from 'services'
import { PriceEntity, OracleFeedPriceMsg } from 'orm'

export async function parseFeedPrice(
  entityManager: EntityManager,
  txInfo: TxInfo,
  msg: MsgExecuteContract
): Promise<void> {
  const oracleMsg = (msg as unknown) as OracleFeedPriceMsg
  const assetService = Container.get(AssetService)
  const asset = await assetService.get({ oracle: oracleMsg.contract })
  if (!asset) {
    throw new Error(`unknown oracle contract: ${JSON.stringify(msg)}`)
  }

  console.log(msg)

  const priceService = Container.get(PriceService)
  const { price } = oracleMsg.execute_msg.feed_price
  const blockTime = new Date(txInfo.timestamp).getTime()

  const priceEntity = await priceService.setOHLC(asset, blockTime, price, false)
  await entityManager.getRepository(PriceEntity).save(priceEntity)
}
