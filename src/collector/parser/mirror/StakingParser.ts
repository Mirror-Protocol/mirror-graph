import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { TxEntity, ContractEntity } from 'orm'
import { TxType } from 'types'

export async function parse(
  manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity
): Promise<void> {
  const { execute_msg: executeMsg } = msg
  let type
  let data

  if (executeMsg['unbond']) {
    const values = log.events[1].attributes.map((attr) => attr.value)

    type = TxType.UNSTAKE
    data = { amount: values[2] }
  } else if (executeMsg['withdraw']) {
    const values = log.events[1].attributes.map((attr) => attr.value)

    type = TxType.WITHDRAW_REWARDS
    data = { amount: values[2], token: values[3] }
    return
  } else {
    return
  }

  const { asset, govId } = contract
  const { txhash: txHash, timestamp } = txInfo
  const datetime = new Date(timestamp)

  const tx = new TxEntity({
    txHash, sender: msg.sender, type, data, datetime, govId, asset
  })
  await manager.save(tx)
}
