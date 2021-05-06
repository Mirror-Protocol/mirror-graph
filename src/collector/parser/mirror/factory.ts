import { findAttributes, findAttribute } from 'lib/terra'
import { ParseArgs } from './parseArgs'
import { govService, assetService } from 'services'
import { AssetEntity } from 'orm'
import { AssetStatus } from 'types'

export async function parse({ manager, log, contract, contractEvent }: ParseArgs): Promise<void> {
  const actionType = contractEvent.action?.actionType
  if (!actionType) {
    return
  }

  if (actionType === 'whitelist') {
    const attributes = findAttributes(log.events, 'from_contract')
    const symbol = findAttribute(attributes, 'symbol') || ''
    const name = findAttribute(attributes, 'name') || ''
    const token = findAttribute(attributes, 'asset_token')
    const pair = findAttribute(attributes, 'pair_contract_addr')
    const lpToken = findAttribute(attributes, 'liquidity_token_addr')
    const govId = contract.govId

    const entities = await govService().whitelisting(govId, symbol, name, token, pair, lpToken)

    await manager.save(entities)
  } else if (actionType === 'migrate_asset') {
    const attributes = findAttributes(log.events, 'from_contract')
    const fromToken = findAttribute(attributes, 'asset_token')
    const token = findAttribute(attributes, 'asset_token_addr')
    const pair = findAttribute(attributes, 'pair_contract_addr')
    const lpToken = findAttribute(attributes, 'liquidity_token_addr')
    const govId = contract.govId

    const asset = await assetService().get(
      { token: fromToken, govId }, undefined, manager.getRepository(AssetEntity)
    )

    asset.status = AssetStatus.DELISTED

    // whitelisting new asset
    const entities = await govService().whitelisting(govId, asset.symbol, asset.name, token, pair, lpToken)

    await manager.save([asset, ...entities])
  }
}
