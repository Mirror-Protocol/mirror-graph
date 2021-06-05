import { findAttributes, findAttribute } from 'lib/terra'
import { ParseArgs } from './parseArgs'
import { govService, assetService, oracleService } from 'services'
import { AssetEntity, OraclePriceEntity } from 'orm'
import { AssetStatus } from 'types'

export async function parse(
  { manager, log, contract, contractEvent, timestamp: txTimestamp }: ParseArgs
): Promise<void> {
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
    const isPreIPO = findAttribute(attributes, 'is_pre_ipo') === 'true'
    const govId = contract.govId

    const entities = await govService().whitelisting(govId, symbol, name, token, pair, lpToken, isPreIPO)
    if (isPreIPO) {
      const price = findAttribute(attributes, 'pre_ipo_price')
      const timestamp = new Date(txTimestamp).getTime()
      const repo = manager.getRepository(OraclePriceEntity)

      entities.push(await oracleService().setOHLC(token, timestamp, price, repo, false))
    }

    await manager.save(entities)
  } else if (actionType === 'migration') {
    const attributes = findAttributes(log.events, 'from_contract')
    const fromToken = findAttribute(attributes, 'asset_token')
    const token = findAttribute(attributes, 'asset_token_addr')
    const pair = findAttribute(attributes, 'pair_contract_addr')
    const lpToken = findAttribute(attributes, 'liquidity_token_addr')
    const govId = contract.govId

    // delisting old asset
    const asset = await assetService().get(
      { token: fromToken, govId }, undefined, manager.getRepository(AssetEntity)
    )

    asset.status = AssetStatus.DELISTED

    await manager.save(asset)

    // whitelisting new asset
    const entities = await govService().whitelisting(govId, asset.symbol, asset.name, token, pair, lpToken)

    await manager.save(entities)
  }
}
