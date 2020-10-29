import { findAttributes, findAttribute } from 'lib/terra'
import { num } from 'lib/num'
import { ParseArgs } from './parseArgs'
import { govService } from 'services'
import { RewardEntity } from 'orm'

export async function parse(
  { manager, height, txHash, timestamp, msg, log, contract }: ParseArgs
): Promise<void> {
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
  } else if (msg['mint']) {
    const datetime = new Date(timestamp)
    const attributes = findAttributes(log.events, 'from_contract')
    const token = findAttribute(attributes, 'asset_token')
    const amount = findAttribute(attributes, 'mint_amount')

    if (num(amount).isGreaterThan(0)) {
      const entity = new RewardEntity({ height, txHash, datetime, token, amount })
      await manager.save(entity)
    }
  }
}
