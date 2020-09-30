import * as bluebird from 'bluebird'
import { EntityManager } from 'typeorm'
import { Container } from 'typedi'
import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { OracleService } from 'services'
import { AssetEntity, ContractEntity, OraclePriceEntity } from 'orm'

export async function parseFeedPrice(
  manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract
): Promise<void> {
  const timestamp = new Date(txInfo.timestamp).getTime()
  const { price_infos: priceInfos } = msg.execute_msg['feed_price']

  await bluebird.mapSeries(priceInfos, async (info) => {
    const token = info['asset_token']
    const price = info['price']
    const asset = await manager.findOne(AssetEntity, { token })
    if (!asset) {
      return
    }

    await Container.get(OracleService).setOHLC(
      asset, timestamp, price, manager.getRepository(OraclePriceEntity)
    )
  })
}

export async function parse(
  manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity,
): Promise<void> {
  if (msg.execute_msg['feed_price']) {
    return parseFeedPrice(manager, txInfo, msg)
  }
}
