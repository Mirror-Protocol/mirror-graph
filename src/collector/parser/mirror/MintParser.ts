import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { MirrorParser } from './MirrorParser'
import { TxEntity, ContractEntity } from 'orm'
import { TxType } from 'types'

export class MintParser extends MirrorParser {
  async parse(
    txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    if (msg.execute_msg['mint']) {
      return this.parseMint(txInfo, msg, log, contract)
    } else if (msg.execute_msg['burn']) {
      return this.parseBurn(txInfo, msg, log, contract)
    } else if (msg.execute_msg['auction']) {
      // todo:
    }

    return []
  }

  private async parseMint(
    txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    const tx = new TxEntity({
      txHash: txInfo.txhash,
      type: TxType.MINT,
      symbol: contract.asset.symbol,
      data: {
        collateralAmount: log.events[1].attributes[2].value,
        mintAmount: log.events[1].attributes[3].value,
      },
      datetime: new Date(txInfo.timestamp),
      gov: contract.gov,
    })

    return [tx]
  }

  private async parseBurn(
    txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    const tx = new TxEntity({
      txHash: txInfo.txhash,
      type: TxType.BURN,
      symbol: contract.asset.symbol,
      data: {
        refundAmount: log.events[1].attributes[2].value,
        burnAmount: log.events[1].attributes[3].value,
      },
      datetime: new Date(txInfo.timestamp),
      gov: contract.gov,
    })

    return [tx]
  }
}
