import * as bluebird from 'bluebird'
import * as logger from 'lib/logger'
import { assetService, ethStatisticService } from 'services'
import { AssetStatus } from 'types'
import { Updater } from 'lib/Updater'

const updater = new Updater(60000 * 5) // 5min
const genesisTimestamp = 1606953600000

async function updateDaily(token: string): Promise<void> {
  const latest = await ethStatisticService().getDailyStatistic(
    { token }, { order: { id: 'DESC' } }
  )
  const from = latest?.datetime.getTime() || genesisTimestamp
  const now = Date.now()

  return ethStatisticService().collectStatistic(token, true, from, now)
}

async function updateHourly(token: string): Promise<void> {
  const latest = await ethStatisticService().getHourlyStatistic(
    { token }, { order: { id: 'DESC' } }
  )
  const from = latest?.datetime.getTime() || genesisTimestamp
  const now = Date.now()

  return ethStatisticService().collectStatistic(token, false, from, now)
}

export async function updateStatistic(): Promise<void> {
  if (!updater.needUpdate(Date.now())) {
    return
  }

  const assets = await assetService().getAll({ where: { status: AssetStatus.LISTED } })

  await bluebird.mapSeries(assets, async (asset) => {
    await updateDaily(asset.token)
    await updateHourly(asset.token)

    await bluebird.delay(1000)
  })

  logger.info('statistic updated')
}
