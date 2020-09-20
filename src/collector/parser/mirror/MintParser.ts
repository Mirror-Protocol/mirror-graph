import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { findAttributes, findAttribute } from 'lib/terra'
import { TxEntity, ContractEntity } from 'orm'
import { TxType } from 'types'
import { MirrorParser } from './MirrorParser'

export class MintParser extends MirrorParser {
  async parse(
    txInfo: TxInfo, msg: MsgExecuteContract, msgIndex: number, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    const { execute_msg: executeMsg } = msg
    let type
    let data

    if (executeMsg['open_position']) {
      const attributes = findAttributes(log.events, 'from_contract')
      const positionIdx = findAttribute(attributes, 'position_idx')
      const mintAmount = findAttribute(attributes, 'mint_amount')
      const collateralAmount = findAttribute(attributes, 'collateral_amount')

      type = TxType.OPEN_POSITION
      data = { positionIdx, mintAmount, collateralAmount }
    } else if (executeMsg['deposit']) {
      const attributes = findAttributes(log.events, 'from_contract')
      const positionIdx = findAttribute(attributes, 'position_idx')
      const depositAmount = findAttribute(attributes, 'deposit_amount')

      type = TxType.DEPOSIT_COLLATERAL
      data = { positionIdx, depositAmount }
    } else if (executeMsg['withdraw']) {
      const attributes = findAttributes(log.events, 'from_contract')
      const positionIdx = findAttribute(attributes, 'position_idx')
      const withdrawAmount = findAttribute(attributes, 'withdraw_amount')
      const taxAmount = findAttribute(attributes, 'tax_amount')

      type = TxType.WITHDRAW_COLLATERAL
      data = { positionIdx, withdrawAmount, taxAmount }
    } else if (executeMsg['burn']) {
      console.log(JSON.stringify(executeMsg['burn']))
      // const values = log.events[1].attributes.map((attr) => attr.value)

      // type = TxType.BURN
      // data = {
      //   refundAmount: values[2], burnAmount: values[3]
      // }
    } else if (executeMsg['auction']) {
      // todo: parse auction msg
      return []
    } else {
      return []
    }

    const { govId } = contract
    const { txhash: txHash, timestamp } = txInfo
    // const price = await this.priceService.getPrice(asset)
    const datetime = new Date(timestamp)

    const tx = new TxEntity({
      txHash, sender: msg.sender, msgIndex, type, data, datetime, govId
    })
    // const ohlc = price && await this.priceService.setOHLC(asset, datetime.getTime(), price)
    // return [tx, ohlc]
    return [tx]
  }
}
