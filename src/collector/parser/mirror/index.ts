import { TxInfo, MsgExecuteContract, TxLog } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { Container } from 'typedi'
import { ContractService } from 'services'
import { ContractType } from 'types'
import { MirrorParser } from './MirrorParser'
import { OracleParser } from './OracleParser'
import { MarketParser } from './MarketParser'

const parser: { [type: string]: MirrorParser } = {
  [ContractType.ORACLE]: new OracleParser(),
  [ContractType.MARKET]: new MarketParser(),
}

export async function parseMirrorMsg(
  manager: EntityManager,
  txInfo: TxInfo,
  msg: MsgExecuteContract,
  log: TxLog
): Promise<void> {
  const contractService = Container.get(ContractService)
  const contract = await contractService.get({ address: msg.contract })
  if (!contract || !parser[contract.type]) {
    return
  }

  return parser[contract.type].parse(manager, txInfo, msg, log, contract)
}
