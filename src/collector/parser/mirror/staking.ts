import { findContractAction } from 'lib/terra'
import { assetService, govService, txService } from 'services'
import { num } from 'lib/num'
import { AssetEntity, AssetPositionsEntity, RewardEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, contract, contractEvent, contractEvents, fee }: ParseArgs
): Promise<void> {
  const { govId } = contract
  const datetime = new Date(timestamp)
  const assetRepo = manager.getRepository(AssetEntity)
  let parsed = {}
  let address = sender

  const actionType = contractEvent.action?.actionType
  if (!actionType) {
    return
  }

  if (actionType === 'bond' || actionType === 'unbond') {
    const type = actionType === 'bond' ? TxType.STAKE : TxType.UNSTAKE
    const { amount, assetToken } = contractEvent.action
    const positionsRepo = manager.getRepository(AssetPositionsEntity)

    if (actionType === 'bond') {
      address = contractEvent.action.stakerAddr

      if (!address) {
        // find send event for find transaction owner.
        const asset = await assetService().get({ token: assetToken }, undefined, assetRepo)
        address = findContractAction(contractEvents, asset.lpToken, {
          actionType: 'send', to: contract.address, amount
        }).action.from
      }
    }

    await assetService().addStakePosition(
      assetToken, type === TxType.STAKE ? amount : `-${amount}`, positionsRepo
    )

    parsed = {
      type,
      data: { assetToken, amount },
      token: assetToken,
      tags: [assetToken],
    }
  } else if (actionType === 'withdraw') {
    const { amount } = contractEvent.action

    if (amount === '0') {
      return
    }

    parsed = {
      type: TxType.WITHDRAW_REWARDS,
      data: { amount },
      token: govService().get().mirrorToken,
      tags: [govService().get().mirrorToken],
    }
  } else if (actionType === 'deposit_reward') {
    const datetime = new Date(timestamp)

    const { assetToken: token, amount } = contractEvent.action

    if (token && amount && num(amount).isGreaterThan(0)) {
      const entity = new RewardEntity({ height, txHash, datetime, token, amount })
      await manager.save(entity)
    }

    return
  } else {
    return
  }

  await txService().newTx({
    ...parsed, height, txHash, address, datetime, govId, contract, fee
  }, manager)
}
