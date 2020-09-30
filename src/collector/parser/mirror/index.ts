import { TxInfo, MsgExecuteContract, TxLog } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { Container } from 'typedi'
import { ContractService } from 'services'
import { ContractType } from 'types'
import { parse as parseFactory } from './FactoryParser'
import { parse as parseOracle } from './OracleParser'
import { parse as parsePair } from './PairParser'
import { parse as parseToken } from './TokenParser'
import { parse as parseMint } from './MintParser'
// import { StakingParser } from './StakingParser'

export async function parseMirrorMsg(
  manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog
): Promise<void> {
  const contractService = Container.get(ContractService)
  const contract = await contractService.get({ address: msg.contract })
  if (!contract)
    return

  switch (contract.type) {
    case ContractType.FACTORY:
      return parseFactory(manager, txInfo, msg, log, contract)
    case ContractType.ORACLE:
      return parseOracle(manager, txInfo, msg, log, contract)
    case ContractType.PAIR:
      return parsePair(manager, txInfo, msg, log, contract)
    case ContractType.TOKEN:
      return parseToken(manager, txInfo, msg, log, contract)
    case ContractType.MINT:
      return parseMint(manager, txInfo, msg, log, contract)
  }
}
