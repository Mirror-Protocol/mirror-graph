import { findAttributes, findAttribute } from 'lib/terra'
import { airdropService, govService, txService } from 'services'
import { AirdropEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, msg, log, contract, fee }: ParseArgs
): Promise<void> {
  const attributes = findAttributes(log.events, 'from_contract')
  const { govId } = contract
  const datetime = new Date(timestamp)
  let parsed = {}

  if (msg['claim']) {
    const address = findAttribute(attributes, 'address')
    const amount = findAttribute(attributes, 'amount')
    const stage = findAttribute(attributes, 'stage')

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
    }
  } else {
    return
  }

  await txService().newTx({
    ...parsed, height, txHash, address: sender, datetime, govId, contract, fee
  }, manager)
}
