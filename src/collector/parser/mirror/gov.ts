import { findAttributes, findAttribute } from 'lib/terra'
import { govService, txService } from 'services'
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
  const { manager, height, txHash, sender, msg, log, contract, timestamp, fee } = args
  const { mirrorToken } = govService().get()
  const { govId } = contract
  const datetime = new Date(timestamp)
  const attributes = findAttributes(log.events, 'from_contract')
  let parsed = {}

  if (msg['create_poll']) {
    const pollId = findAttribute(attributes, 'poll_id')
    const amount = findAttribute(attributes, 'amount')

    parsed = {
      type: TxType.GOV_CREATE_POLL,
      data: { pollId, amount },
      token: mirrorToken,
    }
  } else if (msg['end_poll']) {
    const pollId = findAttribute(attributes, 'poll_id')
    const passed = findAttribute(attributes, 'passed')
    const amount = findAttribute(attributes, 'amount')

    parsed = {
      type: TxType.GOV_END_POLL,
      data: { pollId, amount, passed },
      token: mirrorToken,
    }
  } else if (msg['execute_poll']) {
    const {
      from_contract: { action },
    } = log.eventsByType

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
      token: mirrorToken,
    }
  } else if (msg['withdraw_voting_tokens']) {
    const amount = findAttribute(attributes, 'amount')

    parsed = {
      type: TxType.GOV_UNSTAKE,
      data: { amount },
      token: mirrorToken,
    }
  } else if (msg['withdraw_voting_rewards']) {
    const amount = findAttribute(attributes, 'amount')

    parsed = {
      type: TxType.GOV_WITHDRAW_VOTING_REWARDS,
      data: { amount },
      token: mirrorToken,
    }
  } else if (msg['cast_vote']) {
    const pollId = findAttribute(attributes, 'poll_id')
    const amount = findAttribute(attributes, 'amount')
    const voteOption = findAttribute(attributes, 'vote_option')

    parsed = {
      type: TxType.GOV_CAST_POLL,
      data: { pollId, amount, voteOption },
      token: mirrorToken,
    }
  } else {
    return
  }

  await txService().newTx(
    {
      ...parsed,
      height,
      txHash,
      address: sender,
      datetime,
      govId,
      contract,
      fee,
      tags: [mirrorToken],
    },
    manager
  )
}
