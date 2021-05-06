import { govService, txService } from 'services'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(args: ParseArgs): Promise<void> {
  const { manager, height, txHash, sender, contract, timestamp, contractEvent, fee } = args
  const { mirrorToken, id: govId } = govService().get()
  const datetime = new Date(timestamp)
  let address = sender
  let parsed = {}

  const actionType = contractEvent.action?.actionType
  if (!actionType) {
    return
  }

  if (actionType === 'create_poll') {
    const { pollId, amount, creator } = contractEvent.action

    address = creator

    parsed = {
      type: TxType.GOV_CREATE_POLL,
      data: { pollId, amount, creator },
      token: mirrorToken,
    }
  } else if (actionType === 'end_poll') {
    const { pollId, passed, amount } = contractEvent.action

    parsed = {
      type: TxType.GOV_END_POLL,
      data: { pollId, amount, passed },
      token: mirrorToken,
    }
  } else if (actionType === 'staking') {
    const { amount, share, sender } = contractEvent.action

    address = sender

    parsed = {
      type: TxType.GOV_STAKE,
      data: { amount, share, sender },
      token: mirrorToken,
    }
  } else if (actionType === 'withdraw') {
    const { amount, recipient } = contractEvent.action

    address = recipient

    parsed = {
      type: TxType.GOV_UNSTAKE,
      data: { amount, recipient },
      token: mirrorToken,
    }
  } else if (actionType === 'cast_vote') {
    const { pollId, amount, voter, voteOption } = contractEvent.action

    address = voter

    parsed = {
      type: TxType.GOV_CAST_POLL,
      data: { pollId, amount, voteOption, voter },
      token: mirrorToken,
    }
  } else {
    return
  }

  await txService().newTx({
    ...parsed, height, txHash, address, datetime, govId, contract, fee, tags: [mirrorToken],
  }, manager)
}
