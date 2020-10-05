import { TxInfo, MsgExecuteContract, TxLog } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { Container } from 'typedi'
import { ContractService } from 'services'
import { ContractType } from 'types'
import { ContractEntity } from 'orm'
import { ParseArgs } from './parseArgs'
import * as factory from './factory'
import * as oracle from './oracle'
import * as pair from './pair'
import * as token from './token'
import * as mint from './mint'
import * as staking from './staking'

export async function parseMirrorMsg(
  manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog
): Promise<void> {
  const contractService = Container.get(ContractService)
  const contract = await contractService.get(
    { address: msg.contract }, undefined, manager.getRepository(ContractEntity)
  )
  if (!contract)
    return

  const args: ParseArgs = {
    manager,
    height: txInfo.height,
    txHash: txInfo.txhash,
    timestamp: txInfo.timestamp,
    sender: msg.sender,
    coins: msg.coins,
    msg: msg.execute_msg,
    log,
    contract,
  }

  switch (contract.type) {
    case ContractType.FACTORY:
      return factory.parse(args)

    case ContractType.ORACLE:
      return oracle.parse(args)

    case ContractType.PAIR:
      return pair.parse(args)

    case ContractType.TOKEN:
    case ContractType.LP_TOKEN:
      return token.parse(args)

    case ContractType.MINT:
      return mint.parse(args)

    case ContractType.STAKING:
      return staking.parse(args)
  }
}
