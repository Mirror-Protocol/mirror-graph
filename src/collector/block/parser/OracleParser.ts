import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { Parser } from './Parser'
import { AssetEntity, PriceEntity, OracleFeedPriceMsg } from 'orm'

export class OracleParser extends Parser {
  private async findAssetByOracle(oracleAddress: string): Promise<AssetEntity> {
    return this.assetService.get({ oracle: oracleAddress })
  }

  public async parse(
    entityManager: EntityManager,
    txInfo: TxInfo,
    msg: MsgExecuteContract,
    log: TxLog
  ): Promise<boolean> {
    if (msg.execute_msg['feed_price']) {
      await this.parseFeedPrice(entityManager, txInfo, msg, log)
      return true
    }

    return false
  }

  private async parseFeedPrice(
    entityManager: EntityManager,
    txInfo: TxInfo,
    rawMsg: MsgExecuteContract,
    log: TxLog
  ): Promise<void> {
    const msg = (rawMsg as unknown) as OracleFeedPriceMsg
    const asset = await this.findAssetByOracle(msg.contract)
    if (!asset) {
      return
    }

    const { price } = msg.execute_msg.feed_price
    const timestamp = new Date(txInfo.timestamp).getTime()

    const priceEntity = await this.priceService.setOHLC(asset, timestamp, price, false)
    await entityManager.getRepository(PriceEntity).save(priceEntity)
  }
}
