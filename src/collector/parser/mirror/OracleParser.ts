import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { OraclePriceEntity, ContractEntity } from 'orm'
import { OracleFeedPriceMsg } from 'types'
import { MirrorParser } from './MirrorParser'

export class OracleParser extends MirrorParser {
  async parse(
    manager: EntityManager,
    txInfo: TxInfo,
    msg: MsgExecuteContract,
    log: TxLog,
    contract: ContractEntity
  ): Promise<void> {
    if (msg.execute_msg['feed_price']) {
      return this.parseFeedPrice(
        manager,
        txInfo,
        (msg as unknown) as OracleFeedPriceMsg,
        log,
        contract
      )
    }
  }

  async parseFeedPrice(
    manager: EntityManager,
    txInfo: TxInfo,
    msg: OracleFeedPriceMsg,
    log: TxLog,
    contract: ContractEntity
  ): Promise<void> {
    // const asset = await this.assetService.get({ oracle: contract })
    const asset = contract.asset
    if (!asset) {
      return
    }

    const { price } = msg.execute_msg.feed_price
    const timestamp = new Date(txInfo.timestamp).getTime()

    const oraclePrice = await this.oraclePriceService.setOHLC(asset, timestamp, price, false)
    await manager.getRepository(OraclePriceEntity).save(oraclePrice)
  }
}
