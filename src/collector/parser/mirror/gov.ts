import { findAttributes, findAttribute } from 'lib/terra'
import { govService, accountService, priceService } from 'services'
import { TxEntity, BalanceEntity, PriceEntity } from 'orm'
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
  const { mirrorToken } = govService().get()
  const { govId } = contract
  const datetime = new Date(timestamp)
  const attributes = findAttributes(log.events, 'from_contract')
  let parsed = {}

  if (msg['create_poll']) {
    const pollId = findAttribute(attributes, 'poll_id')
    const amount = findAttribute(attributes, 'amount')

    await accountService().removeBalance(
      sender, mirrorToken, amount, manager.getRepository(BalanceEntity)
    )

    parsed = {
      type: TxType.GOV_CREATE_POLL,
      data: { pollId, amount },
      token: mirrorToken,
    }
  } else if (msg['end_poll']) {
    const pollId = findAttribute(attributes, 'poll_id')
    const passed = findAttribute(attributes, 'passed')
    const amount = findAttribute(attributes, 'amount')

    if (passed === 'true') {
      const to = findAttribute(attributes, 'to')
      const price = await priceService().getPrice(mirrorToken, datetime.getTime(), manager.getRepository(PriceEntity))
      await accountService().addBalance(
        to, mirrorToken, price || '0', amount, manager.getRepository(BalanceEntity)
      )
    }

    parsed = {
      type: TxType.GOV_END_POLL,
      data: { pollId, amount, passed },
      token: mirrorToken,
    }
  } else if (msg['execute_poll']) {
    const { from_contract: { action } } = log.eventsByType

    if (action.includes('whitelist')) {
      return parseExecutePoll(args)
    }

    return
  } else if (msg['stake_voting_tokens']) {
    const amount = findAttribute(attributes, 'amount')
    const share = findAttribute(attributes, 'share')

    await accountService().removeBalance(
      sender, mirrorToken, amount, manager.getRepository(BalanceEntity)
    )

    parsed = {
      type: TxType.GOV_STAKE,
      data: { amount, share },
      token: mirrorToken,
    }
  } else if (msg['withdraw_voting_tokens']) {
    const amount = findAttribute(attributes, 'amount')

    const price = await priceService().getPrice(mirrorToken, datetime.getTime(), manager.getRepository(PriceEntity))
    await accountService().addBalance(
      sender, mirrorToken, price || '0', amount, manager.getRepository(BalanceEntity)
    )

    parsed = {
      type: TxType.GOV_UNSTAKE,
      data: { amount },
      token: mirrorToken,
    }
  } else {
    return
  }

  const tx = new TxEntity({
    ...parsed, height, txHash, address: sender, datetime, govId, contract
  })
  await manager.save(tx)
}
