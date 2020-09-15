import { TxInfo, MsgExecuteContract, TxLog } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { ContractService } from 'services'
import { ContractType } from 'types'
import { MirrorParser } from './MirrorParser'
import { OracleParser } from './OracleParser'
import { MarketParser } from './MarketParser'
import { TokenParser } from './TokenParser'
import { MintParser } from './MintParser'
import { StakingParser } from './StakingParser'

const parser: { [type: string]: MirrorParser } = {
  [ContractType.MARKET]: new MarketParser(),
  [ContractType.MINT]: new MintParser(),
  [ContractType.ORACLE]: new OracleParser(),
  [ContractType.TOKEN]: new TokenParser(),
  [ContractType.LP_TOKEN]: new TokenParser(),
  [ContractType.STAKING]: new StakingParser(),
}

export async function parseMirrorMsg(
  txInfo: TxInfo, msg: MsgExecuteContract, msgIndex: number, log: TxLog
): Promise<unknown[]> {
  const contractService = Container.get(ContractService)
  const contract = await contractService.get({ address: msg.contract })

  if (!contract || !parser[contract.type]) {
    return []
  }

  return parser[contract.type].parse(txInfo, msg, msgIndex, log, contract)
}
