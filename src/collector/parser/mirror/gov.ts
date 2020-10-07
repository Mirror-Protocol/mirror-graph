import { findAttributes, findAttribute } from 'lib/terra'
import { govService } from 'services'
import { ParseArgs } from './parseArgs'

export async function parseExecutePoll({ manager, log, contract }: ParseArgs): Promise<void> {
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

export async function parse(args: ParseArgs): Promise<void> {
  const { msg, log } = args

  if (msg['execute_poll']) {
    const { from_contract: { action } } = log.eventsByType

    if (action.includes('whitelist')) {
      return parseExecutePoll(args)
    }
  }
}
