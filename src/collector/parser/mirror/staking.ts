import { Container } from 'typedi'
import { findAttributes, findAttribute } from 'lib/terra'
import { AssetService } from 'services'
import { AssetEntity, TxEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './types'

export async function parse(
  { manager, height, txHash, timestamp, sender, msg, log, contract }: ParseArgs
): Promise<void> {
  const attributes = findAttributes(log.events, 'from_contract')
  let parsed = {}

  const assetService = Container.get(AssetService)

  if (msg['bond'] || msg['unbond']) {
    const amount = findAttribute(attributes, 'amount')
    const assetToken = findAttribute(attributes, 'asset_token')
    const asset = await assetService.get(
      { token: assetToken }, manager.getRepository(AssetEntity)
    )

    parsed = {
      type: msg['bond'] ? TxType.STAKE : TxType.UNSTAKE,
      data: { assetToken, amount },
      assetId: asset.id,
    }
  } else {
    return
  }

  const { govId } = contract
  const datetime = new Date(timestamp)

  const tx = new TxEntity({
    ...parsed, height, txHash, sender, datetime, govId, contract
  })
  await manager.save(tx)
}
