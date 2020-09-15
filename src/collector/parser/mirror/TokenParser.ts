import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { TxEntity, ContractEntity } from 'orm'
import { TxType, ContractType } from 'types'
import { MirrorParser } from './MirrorParser'

export class TokenParser extends MirrorParser {
  async parse(
    txInfo: TxInfo, msg: MsgExecuteContract, msgIndex: number, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    if (msg.execute_msg['send']) {
      return this.parseSend(txInfo, msg, msgIndex, log, contract)
    }

    return []
  }

  private async parseSell(
    txInfo: TxInfo, msg: MsgExecuteContract, msgIndex: number, log: TxLog, contract: ContractEntity, marketMsg: object
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

    const tx = new TxEntity({
      txHash, msgIndex, type, symbol: asset.symbol, data, datetime, gov
    })
    const ohlc = await this.priceService.setOHLC(asset, datetime.getTime(), price)

    return [tx, ohlc]
  }

  private async parseStake(
    txInfo: TxInfo, msg: MsgExecuteContract, msgIndex: number, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    const type = TxType.STAKE
    const values = log.events[1].attributes.map((attr) => attr.value)
    const data = { amount: values[4] }

    const { asset, gov } = contract
    const { txhash: txHash, timestamp } = txInfo
    const datetime = new Date(timestamp)

    const tx = new TxEntity({
      txHash, msgIndex, type, symbol: asset.lpTokenSymbol, data, datetime, gov
    })

    return [tx]
  }

  private async parseSend(
    txInfo: TxInfo, msg: MsgExecuteContract, msgIndex: number, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    const { contract: hookAddress, msg: encryptedHookMsg } = msg.execute_msg['send']

    if (hookAddress) {
      const hookContract = await this.contractService.get({ address: hookAddress })
      const hookMsg = JSON.parse(Buffer.from(encryptedHookMsg, 'base64').toString())

      if (hookContract.type === ContractType.MARKET) {
        if (hookMsg['sell']) {
          return this.parseSell(txInfo, msg, msgIndex, log, contract, hookMsg['sell'])
        }
      } else if (hookContract.type === ContractType.STAKING) {
        if (hookMsg['bond']) {
          return this.parseStake(txInfo, msg, msgIndex, log, contract)
        }
      }

      return []
    }

    // todo: parse normal send

    return []
  }
}
