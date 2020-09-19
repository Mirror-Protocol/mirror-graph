import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { ContractEntity } from 'orm'
import { MirrorParser } from './MirrorParser'

export class OracleParser extends MirrorParser {
  async parse(
    txInfo: TxInfo, msg: MsgExecuteContract, msgIndex: number, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    if (msg.execute_msg['feed_price']) {
      return this.parseFeedPrice(txInfo, msg, log, contract)
    }
  }

  async parseFeedPrice(
    txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    const timestamp = new Date(txInfo.timestamp).getTime()
    const { asset_info: assetInfo, price } = msg.execute_msg['feed_price']
    const tokenAddress = assetInfo?.token?.contract_addr
    if (!tokenAddress) {
      return []
    }
    const tokenContract = await this.contractService.get(
      { address: tokenAddress }, { relations: ['asset'] }
    )

    const priceEntity = await this.oracleService.setOHLC(tokenContract.asset, timestamp, price, false)

    return [priceEntity]
  }
}
