import { findAttributes, findAttribute } from 'lib/terra'
import { govService } from 'services'
import { TxEntity } from 'orm'
import { TxType } from 'types'
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
  const { manager, height, txHash, sender, msg, log, contract, timestamp } = args
  const attributes = findAttributes(log.events, 'from_contract')
  let parsed = {}

  if (msg['execute_poll']) {
    const { from_contract: { action } } = log.eventsByType

    if (action.includes('whitelist')) {
      return parseExecutePoll(args)
    }

    return
  } else if (msg['stake_voting_tokens']) {
    const amount = findAttribute(attributes, 'amount')
    const share = findAttribute(attributes, 'share')
    parsed = {
      type: TxType.GOV_STAKE,
      data: { amount, share },
      token: govService().get().mirrorToken,
    }
  } else if (msg['withdraw_voting_tokens']) {
    const amount = findAttribute(attributes, 'amount')
    parsed = {
      type: TxType.GOV_UNSTAKE,
      data: { amount },
      token: govService().get().mirrorToken,
    }
  } else {
    return
  }

  const { govId } = contract
  const datetime = new Date(timestamp)

  const tx = new TxEntity({
    ...parsed, height, txHash, address: sender, datetime, govId, contract
  })
  await manager.save(tx)
}
