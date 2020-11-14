import { findAttributes, findAttribute } from 'lib/terra'
import { assetService, govService, txService } from 'services'
import { AssetPositionsEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, msg, log, contract, fee }: ParseArgs
): Promise<void> {
  const attributes = findAttributes(log.events, 'from_contract')
  const { govId } = contract
  const datetime = new Date(timestamp)
  let parsed = {}

  if (msg['bond'] || msg['unbond']) {
    const type = msg['bond'] ? TxType.STAKE : TxType.UNSTAKE
    const amount = findAttribute(attributes, 'amount')
    const assetToken = findAttribute(attributes, 'asset_token')
    const positionsRepo = manager.getRepository(AssetPositionsEntity)

    await assetService().addStakePosition(
      assetToken, type === TxType.STAKE ? amount : `-${amount}`, positionsRepo
    )

    parsed = {
      type,
      data: { assetToken, amount },
      token: assetToken,
      tags: [assetToken],
    }
  } else if (msg['withdraw']) {
    const amount = findAttribute(attributes, 'amount')

    parsed = {
      type: TxType.WITHDRAW_REWARDS,
      data: { amount },
      token: govService().get().mirrorToken,
      tags: [govService().get().mirrorToken],
    }
  } else {
    return
  }

  await txService().newTx({
    ...parsed, height, txHash, address: sender, datetime, govId, contract, fee
  }, manager)
}
