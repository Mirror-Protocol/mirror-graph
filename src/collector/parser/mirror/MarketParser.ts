import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { MirrorParser } from './MirrorParser'
import { TxEntity, ContractEntity } from 'orm'
import { TxType } from 'types'

export class MarketParser extends MirrorParser {
  async parse(
    manager: EntityManager,
    txInfo: TxInfo,
    msg: MsgExecuteContract,
    log: TxLog,
    contract: ContractEntity
  ): Promise<void> {
    if (msg.execute_msg['buy'] || msg.execute_msg['sell']) {
      await this.parseBuyOrSell(manager, txInfo, msg, log, contract)
    }
  }

  private async parseBuyOrSell(
    manager: EntityManager,
    txInfo: TxInfo,
    msg: MsgExecuteContract,
    log: TxLog,
    contract: ContractEntity
  ): Promise<void> {
    const symbol = msg.execute_msg['buy']
      ? msg.execute_msg['buy'].symbol
      : msg.execute_msg['sell'].symbol

    const tx = Object.assign(new TxEntity(), {
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
      gov: contract.gov,
    })
    await manager.getRepository(TxEntity).save(tx)
  }
}
