import * as bluebird from 'bluebird'
import { EntityManager } from 'typeorm'
import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { AssetEntity, ContractEntity } from 'orm'
import { MirrorParser } from './MirrorParser'

export class OracleParser extends MirrorParser {
  async parse(
    manager: EntityManager,
    txInfo: TxInfo,
    msg: MsgExecuteContract,
    msgIndex: number,
    log: TxLog,
    contract: ContractEntity,
  ): Promise<boolean> {
    if (msg.execute_msg['feed_price']) {
      return this.parseFeedPrice(manager, txInfo, msg)
    }

    return false
  }

  async parseFeedPrice(manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract): Promise<boolean> {
    const timestamp = new Date(txInfo.timestamp).getTime()
    const { price_infos: priceInfos } = msg.execute_msg['feed_price']

    await bluebird.mapSeries(priceInfos, async (info) => {
      const token = info['asset_token']
      const price = info['price']
      const asset = await manager.findOne(AssetEntity, { token })
      if (!asset) {
        return
      }

      await this.oracleService.setOHLC(manager, asset, timestamp, price)
    })

    return true
  }
}
