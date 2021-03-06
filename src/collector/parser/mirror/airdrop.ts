import { airdropService, govService, txService } from 'services'
import { AirdropEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, contract, contractEvent, fee }: ParseArgs
): Promise<void> {
  const { govId } = contract
  const datetime = new Date(timestamp)
  let parsed = {}

  const actionType = contractEvent.action?.actionType
  if (!actionType) {
    return
  }

  if (actionType === 'claim') {
    const { address, amount, stage } = contractEvent.action

    const airdropEntity = await airdropService().get(
      { address, stage: +stage, amount }, undefined, manager.getRepository(AirdropEntity)
    )

    if (airdropEntity) {
      airdropEntity.claimable = false
      await manager.save(airdropEntity)
    }

    parsed = {
      type: TxType.CLAIM_AIRDROP,
      data: { address, amount, stage },
      token: govService().get().mirrorToken,
      tags: [govService().get().mirrorToken],
      address,
    }
  } else {
    return
  }

  await txService().newTx({
    ...parsed, height, txHash, datetime, govId, contract, fee
  }, manager)
}
