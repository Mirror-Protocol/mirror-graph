import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { findAttributes, findAttribute } from 'lib/terra'
import { AssetEntity, ContractEntity } from 'orm'
import { ContractType } from 'types'
import { MirrorParser } from './MirrorParser'

export class FactoryParser extends MirrorParser {
  async parse(
    txInfo: TxInfo, msg: MsgExecuteContract, msgIndex: number, log: TxLog, contract: ContractEntity
  ): Promise<unknown[]> {
    const { execute_msg: executeMsg } = msg

    if (executeMsg['whitelist']) {
      const attributes = findAttributes(log.events, 'from_contract')
      const symbol = findAttribute(attributes, 'symbol')
      const tokenContract = findAttribute(attributes, 'asset_token')
      const pairContract = findAttribute(attributes, 'pair_contract_addr')
      const lpTokenContract = findAttribute(attributes, 'liquidity_token_addr')

      if (!tokenContract || !pairContract || !lpTokenContract) {
        throw new Error(`whitelist parsing failed. token(${tokenContract}), lpToken(${lpTokenContract}), pair(${pairContract})`)
      }

      const govId = contract.govId
      const asset = new AssetEntity({ symbol, name: symbol, govId })

      return [
        asset,
        new ContractEntity({ address: tokenContract, type: ContractType.TOKEN, govId, asset }),
        new ContractEntity({ address: pairContract, type: ContractType.PAIR, govId, asset }),
        new ContractEntity({ address: lpTokenContract, type: ContractType.LP_TOKEN, govId, asset }),
      ]
    }

    return []
  }
}
