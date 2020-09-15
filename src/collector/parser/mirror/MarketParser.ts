import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { MirrorParser } from './MirrorParser'
import { TxEntity, ContractEntity } from 'orm'
import { TxType } from 'types'

export class MarketParser extends MirrorParser {
  async parse(
    txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    let type
    let data

    if (msg.execute_msg['buy']) {
      type = TxType.BUY

      const values = log.events[1].attributes.map((attr) => attr.value)
      data = { offer: values[2], receive: values[3], spread: values[4], fee: values[5] }
    } else if (msg.execute_msg['provide_liquidity']) {
      type = TxType.PROVIDE_LIQUIDITY

      const values = log.events[1].attributes.map((attr) => attr.value)
      data = { coins: values[2], share: values[3] }
    } else if (msg.execute_msg['withdraw_liquidity']) {
      type = TxType.WITHDRAW_LIQUIDITY

      const values = log.events[1].attributes.map((attr) => attr.value)
      data = {
        withdrawnShare: values[2], refundAssetAmount: values[3], refundCollateralAmount: values[4]
      }
    } else {
      return []
    }

    const { asset, gov } = contract
    const { txhash: txHash, timestamp } = txInfo
    const price = await this.assetService.getPrice(asset)
    const datetime = new Date(timestamp)

    const tx = new TxEntity({ txHash, type, symbol: asset.symbol, data, datetime, gov })
    const ohlc = await this.priceService.setOHLC(asset, datetime.getTime(), price)

    return [tx, ohlc]
  }
}
