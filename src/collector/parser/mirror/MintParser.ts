import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { MirrorParser } from './MirrorParser'
import { TxEntity, ContractEntity } from 'orm'
import { TxType } from 'types'

export class MintParser extends MirrorParser {
  async parse(
    txInfo: TxInfo, msg: MsgExecuteContract, msgIndex: number, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    const { execute_msg: executeMsg } = msg
    let type
    let data

    if (executeMsg['mint']) {
      const values = log.events[1].attributes.map((attr) => attr.value)

      type = TxType.MINT
      data = {
        collateralAmount: values[2], mintAmount: values[3]
      }
    } else if (executeMsg['burn']) {
      const values = log.events[1].attributes.map((attr) => attr.value)

      type = TxType.BURN
      data = {
        refundAmount: values[2], burnAmount: values[3]
      }
    } else if (executeMsg['auction']) {
      // todo: parse auction msg
      return []
    } else {
      return []
    }

    const { asset, govId } = contract
    const { txhash: txHash, timestamp } = txInfo
    const datetime = new Date(timestamp)

    const tx = new TxEntity({
      txHash, sender: msg.sender, msgIndex, type, symbol: asset.symbol, data, datetime, govId
    })

    return [tx]
  }
}
