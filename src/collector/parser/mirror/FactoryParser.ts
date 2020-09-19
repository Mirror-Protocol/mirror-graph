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
      const token = findAttribute(attributes, 'asset_token')
      const pair = findAttribute(attributes, 'pair_contract_addr')
      const lpToken = findAttribute(attributes, 'liquidity_token_addr')

      if (!token || !pair || !lpToken) {
        throw new Error(`whitelist parsing failed. token(${token}), lpToken(${lpToken}), pair(${pair})`)
      }

      console.log(JSON.stringify(executeMsg))

      const govId = contract.govId
      const asset = new AssetEntity({
        symbol, name: symbol, govId, address: token, pair, lpToken
      })

      return [
        asset,
        new ContractEntity({ address: token, type: ContractType.TOKEN, govId, asset }),
        new ContractEntity({ address: pair, type: ContractType.PAIR, govId, asset }),
        new ContractEntity({ address: lpToken, type: ContractType.LP_TOKEN, govId, asset }),
      ]
    }

    return []
  }
}
