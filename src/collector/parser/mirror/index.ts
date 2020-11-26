import { TxInfo, MsgExecuteContract, TxLog } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { contractService } from 'services'
import { ContractType } from 'types'
import { ContractEntity } from 'orm'
import { ParseArgs } from './parseArgs'
import * as factory from './factory'
import * as oracle from './oracle'
import * as pair from './pair'
import * as token from './token'
import * as mint from './mint'
import * as staking from './staking'
import * as gov from './gov'
import * as collector from './collector'
import * as tokenTransfer from './tokenTransfer'
import * as uusdTransfer from './uusdTransfer'
import * as fee from './fee'
import * as airdrop from './airdrop'

export async function parseMirrorMsg(
  manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog
): Promise<void> {
  const contractRepo = manager.getRepository(ContractEntity)
  const contract = await contractService().get({ address: msg.contract }, undefined, contractRepo)

  if (!contract)
    return

  const args: ParseArgs = {
    manager,
    height: txInfo.height,
    txHash: txInfo.txhash,
    timestamp: txInfo.timestamp,
    fee: txInfo.tx.fee.amount.toString(),
    sender: msg.sender,
    coins: msg.coins,
    msg: msg.execute_msg,
    log,
    contract,
  }

  switch (contract.type) {
    case ContractType.GOV:
      await gov.parse(args)
      break

    case ContractType.FACTORY:
      await factory.parse(args)
      break

    case ContractType.ORACLE:
      await oracle.parse(args)
      break

    case ContractType.PAIR:
      await pair.parse(args)
      break

    case ContractType.TOKEN:
    case ContractType.LP_TOKEN:
      await token.parse(args)
      break

    case ContractType.MINT:
      await mint.parse(args)
      break

    case ContractType.STAKING:
      await staking.parse(args)
      break

    case ContractType.COLLECTOR:
      await collector.parse(args)
      break

    case ContractType.AIRDROP:
      await airdrop.parse(args)
      break

    default:
      return
  }

  // tracking token balance
  await tokenTransfer.parse(args)
  // tracking uusd balance
  await uusdTransfer.parse(manager, txInfo, log)
  // tracking fee
  await fee.parse(manager, txInfo, msg.sender)
}
