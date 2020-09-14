import { TxInfo, MsgExecuteContract, TxLog } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { GovService, ContractService } from 'services'
import { ContractType } from 'types'
import { MirrorParser } from './MirrorParser'
import { OracleParser } from './OracleParser'
import { MarketParser } from './MarketParser'
import { TokenParser } from './TokenParser'
import { MintParser } from './MintParser'

const parser: { [type: string]: MirrorParser } = {
  [ContractType.ORACLE]: new OracleParser(),
  [ContractType.MARKET]: new MarketParser(),
  [ContractType.TOKEN]: new TokenParser(),
  [ContractType.MINT]: new MintParser(),
}

export async function parseMirrorMsg(
  txInfo: TxInfo,
  msg: MsgExecuteContract,
  log: TxLog
): Promise<unknown[]> {
  const govService = Container.get(GovService)
  const contractService = Container.get(ContractService)
  const contract = await contractService.get({
    gov: govService.get(),
    address: msg.contract,
  })
  if (!contract || !parser[contract.type]) {
    return []
  }

  return parser[contract.type].parse(txInfo, msg, log, contract)
}
