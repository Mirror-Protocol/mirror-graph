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
    const { price } = msg.execute_msg['feed_price']
    const timestamp = new Date(txInfo.timestamp).getTime()

    return [await this.oracleService.setOHLC(contract.asset, timestamp, price, false)]
  }
}
