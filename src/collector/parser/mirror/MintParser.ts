import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { MirrorParser } from './MirrorParser'
import { TxEntity, ContractEntity } from 'orm'
import { TxType } from 'types'

export class MintParser extends MirrorParser {
  async parse(
    txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    let type
    let data

    if (msg.execute_msg['mint']) {
      type = TxType.MINT

      const values = log.events[1].attributes.map((attr) => attr.value)
      data = { collateralAmount: values[2], mintAmount: values[3] }
    } else if (msg.execute_msg['burn']) {
      type = TxType.BURN

      const values = log.events[1].attributes.map((attr) => attr.value)
      data = { refundAmount: values[2], burnAmount: values[3] }
    } else if (msg.execute_msg['auction']) {
      // todo:
      return []
    } else {
      return []
    }

    const { asset, gov } = contract
    const { txhash: txHash, timestamp } = txInfo
    const datetime = new Date(timestamp)

    const tx = new TxEntity({ txHash, type, symbol: asset.symbol, data, datetime, gov })

    return [tx]
  }
}
