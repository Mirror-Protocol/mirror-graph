import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { ContractEntity } from 'orm'
import { MirrorParser } from './MirrorParser'

export class OracleParser extends MirrorParser {
  async parse(
    txInfo: TxInfo, msg: MsgExecuteContract, msgIndex: number, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    if (msg.execute_msg['feed_price']) {
      return this.parseFeedPrice(txInfo, msg)
    }
  }

  async parseFeedPrice(txInfo: TxInfo, msg: MsgExecuteContract): Promise<unknown[]> {
    const timestamp = new Date(txInfo.timestamp).getTime()
    const { asset_info: assetInfo, price } = msg.execute_msg['feed_price']
    const address = assetInfo?.token?.contract_addr
    if (!address) {
      return []
    }
    const asset = await this.assetService.get({ address })
    if (!asset) {
      return []
    }

    const priceEntity = await this.oracleService.setOHLC(asset, timestamp, price, false)

    return [priceEntity]
  }
}
