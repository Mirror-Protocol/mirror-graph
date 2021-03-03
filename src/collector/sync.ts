import * as bluebird from 'bluebird'
import { getRepository } from 'typeorm'
import { getLatestBlockHeight, getContractStoreWithHeight } from 'lib/terra'
import { sendSlack } from 'lib/slack'
import { PairPool } from 'lib/mirror'
import { assetService } from 'services'
import { AssetPositionsEntity } from 'orm'
import { AssetStatus } from 'types'

export async function getPairPool(targetHeight: number, pair: string):
  Promise<{ assetAmount: string; collateralAmount: string; totalShare: string }> {
  for (let i = 0; i < 5; i += 1) {
    const queryResult = await getContractStoreWithHeight<PairPool>(pair, { pool: {} })
    const { result: pool, height } = queryResult
    if (height !== targetHeight) {
      await bluebird.delay(200)
      continue
    }

    const token = pool?.assets?.find((asset) => asset.info['token'])
    const nativeToken = pool?.assets?.find((asset) => asset.info['nativeToken'])
    if (!token || !nativeToken) {
      return
    }

    return {
      assetAmount: token.amount,
      collateralAmount: nativeToken.amount,
      totalShare: pool.totalShare
    }
  }
}

export async function syncPairs(height: number): Promise<void> {
  const latestHeight = await getLatestBlockHeight().catch(() => undefined)
  if (height !== latestHeight) {
    return
  }

  const assets = await assetService().getAll({ where: { status: AssetStatus.LISTED } })

  await bluebird.map(assets, async (asset) => {
    const { symbol } = asset
    const pairPool = await getPairPool(height, asset.pair).catch(() => undefined)
    if (!pairPool) {
      return
    }

    const { assetAmount, collateralAmount } = pairPool
    const { pool, uusdPool } = asset.positions

    if (assetAmount !== pool || collateralAmount !== uusdPool) {
      await sendSlack(
        'mirror-collector',
        `sync failed: height: ${height}, ${symbol}, chain: ${assetAmount}-${collateralAmount}, db: ${pool}-${uusdPool}`
      )

      asset.positions.pool = assetAmount
      asset.positions.uusdPool = collateralAmount
    }

    await getRepository(AssetPositionsEntity).save(asset.positions)
  })
}
