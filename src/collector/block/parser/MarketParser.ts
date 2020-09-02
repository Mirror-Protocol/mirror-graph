import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { Parser } from './Parser'
import { TxEntity, TxType } from 'orm'

export class MarketParser extends Parser {
  public async parse(
    entityManager: EntityManager,
    txInfo: TxInfo,
    msg: MsgExecuteContract,
    log: TxLog
  ): Promise<boolean> {
    if (msg.contract !== this.contractService.getContract().market) {
      return false
    }

    if (msg.execute_msg['buy'] || msg.execute_msg['sell']) {
      await this.parseBuyOrSell(entityManager, txInfo, msg, log)
    }

    return true
  }

  private async parseBuyOrSell(
    entityManager: EntityManager,
    txInfo: TxInfo,
    msg: MsgExecuteContract,
    log: TxLog
  ): Promise<void> {
    const contract = this.contractService.getContract()
    if (msg.contract !== contract.market) {
      return
    }

    const symbol = msg.execute_msg['buy']
      ? msg.execute_msg['buy'].symbol
      : msg.execute_msg['sell'].symbol
    const transactionEntity = Object.assign(new TxEntity(), {
      txHash: txInfo.txhash,
      type: msg.execute_msg['buy'] ? TxType.BUY : TxType.SELL,
      symbol,
      data: {
        offer: log.events[1].attributes[2].value,
        receive: log.events[1].attributes[3].value,
        spread: log.events[1].attributes[4].value,
        fee: log.events[1].attributes[5].value,
      },
      datetime: new Date(txInfo.timestamp),
      contract,
    })
    await entityManager.getRepository(TxEntity).save(transactionEntity)
  }
}
