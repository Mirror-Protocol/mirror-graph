import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { Container } from 'typedi'
import { findAttributes, findAttribute } from 'lib/terra'
import { ContractService } from 'services'
import { TxEntity, ContractEntity } from 'orm'
import { TxType, ContractType } from 'types'

export async function parseSell(
  manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity, hookMsg: object
): Promise<void> {
  const type = TxType.SELL
  const attributes = findAttributes(log.events, 'from_contract')
  const data = {
    ...hookMsg,
    offerAmount: findAttribute(attributes, 'offer_amount'),
    returnAmount: findAttribute(attributes, 'return_amount'),
    taxAmount: findAttribute(attributes, 'tax_amount'),
    spreadAmount: findAttribute(attributes, 'spread_amount'),
    commissionAmount: findAttribute(attributes, 'commission_amount'),
  }
  const inValue = data.returnAmount

  const { assetId, govId } = contract
  const { height, txhash: txHash, timestamp } = txInfo
  const { sender } = msg
  const datetime = new Date(timestamp)

  const tx = new TxEntity({
    height, txHash, sender, type, data, inValue, datetime, govId, assetId, contract
  })

  await manager.save(tx)
}

export async function parseStake(
  manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity, hookMsg: object
): Promise<void> {
  const type = TxType.STAKE
  const attributes = findAttributes(log.events, 'from_contract')
  const data = {
    ...hookMsg,
    amount: findAttribute(attributes, 'amount')
  }

  const { assetId, govId } = contract
  const { height, txhash: txHash, timestamp } = txInfo
  const { sender } = msg
  const datetime = new Date(timestamp)

  const tx = new TxEntity({
    height, txHash, sender, type, data, datetime, govId, assetId, contract
  })

  await manager.save(tx)
}

export async function parseSend(
  manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity
): Promise<void> {
  const { contract: hookAddress, msg: encryptedHookMsg } = msg.execute_msg['send']

  if (hookAddress) {
    const hookContract = await Container.get(ContractService).get({ address: hookAddress })
    const hookMsg = JSON.parse(Buffer.from(encryptedHookMsg, 'base64').toString())

    if (hookContract.type === ContractType.PAIR) {
      hookMsg['swap'] &&
        await parseSell(manager, txInfo, msg, log, contract, hookMsg['swap'])
    } else if (hookContract.type === ContractType.STAKING) {
      hookMsg['bond'] &&
        await parseStake(manager, txInfo, msg, log, contract, hookMsg['bond'])
    }

    return
  }

  // todo: parse normal send

  return
}

export async function parse(
  manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity
): Promise<void> {
  if (msg.execute_msg['send']) {
    return parseSend(manager, txInfo, msg, log, contract)
  }
}
