import * as bluebird from 'bluebird'
import * as logger from 'lib/logger'
import { assetService, ethStatisticService } from 'services'
import { AssetStatus } from 'types'
import { Updater } from 'lib/Updater'

const updater = new Updater(60000 * 5) // 5min

export async function updateStatistic(): Promise<void> {
  if (!updater.needUpdate(Date.now())) {
    return
  }

  const assets = await assetService().getAll({ where: { status: AssetStatus.LISTED } })

  await bluebird.mapSeries(assets, async (asset) => {
    const latest = await ethStatisticService().getDailyStatistic(
      { token: asset.token }, { order: { id: 'DESC' }}
    )
    const from = latest?.datetime.getTime() || 1606953600000

    await ethStatisticService().collectDailyStatistic(asset.token, from, Date.now())

    await bluebird.delay(1000)
  })

  logger.info('statistic updated')
}
