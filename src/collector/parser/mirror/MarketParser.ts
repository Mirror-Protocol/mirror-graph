import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { MirrorParser } from './MirrorParser'
import { TxEntity, ContractEntity } from 'orm'
import { TxType } from 'types'

export class MarketParser extends MirrorParser {
  async parse(
    txInfo: TxInfo, msg: MsgExecuteContract, msgIndex: number, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    const { execute_msg: executeMsg } = msg
    let type
    let data

    if (executeMsg['buy']) {
      const values = log.events[1].attributes.map((attr) => attr.value)

      type = TxType.BUY
      data = {
        offer: values[2], receive: values[3], spread: values[4], fee: values[5]
      }
    } else if (executeMsg['provide_liquidity']) {
      const values = log.events[1].attributes.map((attr) => attr.value)

      type = TxType.PROVIDE_LIQUIDITY
      data = {
        coins: values[2], share: values[3]
      }
    } else if (executeMsg['withdraw_liquidity']) {
      const values = log.events[1].attributes.map((attr) => attr.value)

      type = TxType.WITHDRAW_LIQUIDITY
      data = {
        withdrawnShare: values[2], refundAssetAmount: values[3], refundCollateralAmount: values[4]
      }
    } else {
      return []
    }

    const { asset, govId } = contract
    const { txhash: txHash, timestamp } = txInfo
    const price = await this.assetService.getPrice(asset)
    const datetime = new Date(timestamp)

    const tx = new TxEntity({
      txHash, sender: msg.sender, msgIndex, type, symbol: asset.symbol, data, datetime, govId
    })
    const ohlc = price && await this.priceService.setOHLC(asset, datetime.getTime(), price)

    return [tx, ohlc]
  }
}
