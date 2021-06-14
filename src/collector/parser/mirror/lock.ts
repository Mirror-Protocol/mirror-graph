import { txService } from 'services'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, contract, contractEvent, contractEvents, fee, log }: ParseArgs
): Promise<void> {
  const { govId } = contract
  const datetime = new Date(timestamp)
  const address = sender
  let tx = {}

  const actionType = contractEvent.action?.actionType
  if (!actionType) {
    return
  }

  if (actionType === 'unlock_position_funds') {
    const { positionIdx } = contractEvent.action

    tx = {
      type: TxType.WITHDRAW_UNLOCKED_UST,
      data: { positionIdx },
      tags: ['uusd'],
    }
  } else {
    return
  }

  await txService().newTx({
    ...tx, height, txHash, address, datetime, govId, contract, fee
  }, manager)
}
