import * as bluebird from 'bluebird'
import { getRepository } from 'typeorm'
import { getLatestBlockHeight } from 'lib/terra'
import { sendSlack } from 'lib/slack'
import { getPairPool } from 'lib/mirror'
import { assetService } from 'services'
import { AssetPositionsEntity } from 'orm'
import { AssetStatus } from 'types'

export async function syncPairs(height: number): Promise<void> {
  const latestHeight = await getLatestBlockHeight().catch(() => undefined)
  if (height !== latestHeight) {
    return
  }

  const assets = await assetService().getAll({ where: { status: AssetStatus.LISTED } })

  await bluebird.map(assets, async (asset) => {
    const { symbol } = asset
    const { assetAmount, collateralAmount } = await getPairPool(asset.pair)
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
