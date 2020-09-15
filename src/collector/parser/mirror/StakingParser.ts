import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { MirrorParser } from './MirrorParser'
import { TxEntity, ContractEntity } from 'orm'
import { TxType } from 'types'

export class StakingParser extends MirrorParser {
  async parse(
    txInfo: TxInfo, msg: MsgExecuteContract, msgIndex: number, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    const { execute_msg: executeMsg } = msg
    let type
    let data

    if (executeMsg['unbond']) {
      const values = log.events[1].attributes.map((attr) => attr.value)

      type = TxType.UNSTAKE
      data = { amount: values[2] }
    } else if (executeMsg['withdraw']) {
      // todo: parse withdraw rewards
      return []
    } else {
      return []
    }

    const { asset, gov } = contract
    const { txhash: txHash, timestamp } = txInfo
    const datetime = new Date(timestamp)

    const tx = new TxEntity({
      txHash, msgIndex, type, symbol: asset.lpTokenSymbol, data, datetime, gov
    })

    return [tx]
  }
}
