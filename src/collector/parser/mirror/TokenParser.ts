import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { TxEntity, ContractEntity } from 'orm'
import { TxType, ContractType } from 'types'
import { MirrorParser } from './MirrorParser'

export class TokenParser extends MirrorParser {
  async parse(
    txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    if (msg.execute_msg['send']) {
      return this.parseSend(txInfo, msg, log, contract)
    }

    return []
  }

  private async parseSell(
    txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity, marketMsg: object
  ): Promise<unknown[]> {
    const type = TxType.SELL
    const values = log.events[1].attributes.map((attr) => attr.value)
    const data = {
      ...marketMsg, offer: values[7], receive: values[8], spread: values[9], fee: values[10],
    }

    const { asset, gov } = contract
    const { txhash: txHash, timestamp } = txInfo
    const price = await this.assetService.getPrice(asset)
    const datetime = new Date(timestamp)

    const tx = new TxEntity({ txHash, type, symbol: asset.symbol, data, datetime, gov })
    const ohlc = await this.priceService.setOHLC(asset, datetime.getTime(), price)

    return [tx, ohlc]
  }

  private async parseSend(
    txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    const { contract: calledContractAddress, msg: calledMsg } = msg.execute_msg['send']

    if (calledContractAddress) {
      const calledContract = await this.contractService.get({
        gov: contract.gov, address: calledContractAddress,
      })

      if (calledContract.type === ContractType.MARKET) {
        const marketMsg = JSON.parse(Buffer.from(calledMsg, 'base64').toString())

        if (marketMsg['sell']) {
          return this.parseSell(txInfo, msg, log, contract, marketMsg['sell'])
        } else {
          return []
        }
      }
    }

    // todo: parse send

    return []
  }
}
