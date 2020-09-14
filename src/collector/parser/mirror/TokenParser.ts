import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { TxEntity, ContractEntity } from 'orm'
import { TxType, ContractType } from 'types'
import { MirrorParser } from './MirrorParser'

export class TokenParser extends MirrorParser {
  async parse(
    txInfo: TxInfo,
    msg: MsgExecuteContract,
    log: TxLog,
    contract: ContractEntity
  ): Promise<unknown[]> {
    if (msg.execute_msg['send']) {
      return this.parseSend(txInfo, msg, log, contract)
    }

    return []
  }

  private async parseSell(
    txInfo: TxInfo,
    msg: MsgExecuteContract,
    log: TxLog,
    contract: ContractEntity,
    marketMsg: object
  ): Promise<unknown[]> {
    const tx = new TxEntity({
      txHash: txInfo.txhash,
      type: TxType.SELL,
      symbol: contract.asset.symbol,
      data: {
        offer: log.events[1].attributes[7].value,
        receive: log.events[1].attributes[8].value,
        spread: log.events[1].attributes[9].value,
        fee: log.events[1].attributes[10].value,
        ...marketMsg,
      },
      datetime: new Date(txInfo.timestamp),
      gov: contract.gov,
    })

    const price = await this.priceService.setOHLC(
      contract.asset,
      new Date(txInfo.timestamp).getTime(),
      await this.assetService.getPrice(contract.asset)
    )

    return [tx, price]
  }

  private async parseSend(
    txInfo: TxInfo,
    msg: MsgExecuteContract,
    log: TxLog,
    contract: ContractEntity
  ): Promise<unknown[]> {
    const { contract: calledContractAddress, msg: calledMsg } = msg.execute_msg['send']

    if (calledContractAddress) {
      const calledContract = await this.contractService.get({
        gov: contract.gov,
        address: calledContractAddress,
      })

      if (calledContract.type === ContractType.MARKET) {
        const marketMsg = JSON.parse(Buffer.from(calledMsg, 'base64').toString())

        if (marketMsg['sell']) {
          return this.parseSell(txInfo, msg, log, contract, marketMsg['sell'])
        }
      }
    }

    return []
  }
}
