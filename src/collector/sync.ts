import * as bluebird from 'bluebird'
import { EntityManager } from 'typeorm'
import { sendSlack } from 'lib/slack'
import { getPairPool } from 'lib/mirror'
import { assetService } from 'services'
import { AssetEntity, AssetPositionsEntity } from 'orm'
import { AssetStatus } from 'types'

export async function syncPairs(manager: EntityManager, height: number): Promise<void> {
  const assets = await assetService().getAll(
    { where: { status: AssetStatus.LISTED } },
    manager.getRepository(AssetEntity)
  )
  const positionsRepo = manager.getRepository(AssetPositionsEntity)

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

    await positionsRepo.save(asset.positions)
  })
}
