import { findAttributes, findAttribute } from 'lib/terra'
import { ParseArgs } from './parseArgs'
import { govService } from 'services'

export async function parse({ manager, msg, log, contract }: ParseArgs): Promise<void> {
  if (msg['whitelist']) {
    const attributes = findAttributes(log.events, 'from_contract')
    const symbol = findAttribute(attributes, 'symbol') || ''
    const name = findAttribute(attributes, 'name') || ''
    const token = findAttribute(attributes, 'asset_token')
    const pair = findAttribute(attributes, 'pair_contract_addr')
    const lpToken = findAttribute(attributes, 'liquidity_token_addr')
    const govId = contract.govId

    const entities = await govService().whitelisting(govId, symbol, name, token, pair, lpToken)
    await manager.save(entities)
  }
}
