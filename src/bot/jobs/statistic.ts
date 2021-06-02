import * as bluebird from 'bluebird'
import { getManager, EntityManager } from 'typeorm'
import * as logger from 'lib/logger'
import {
  assetService,
  ethStatisticService,
  // bscStatisticService,
} from 'services'
import { Network } from 'types'
import { Updater } from 'lib/Updater'

const updater = new Updater(60000 * 5) // 5min
const genesisTimestamp = 1606953600000

async function updateDaily(manager: EntityManager, token: string): Promise<void> {
  const now = Date.now()
  const ethLatest = await ethStatisticService().getDailyStatistic({ token, network: Network.ETH }, { order: { id: 'DESC' } })
  // const bscLatest = await bscStatisticService().getDailyStatistic({ token, network: Network.BSC }, { order: { id: 'DESC' } })

  await ethStatisticService().collectStatistic(token, true, ethLatest?.datetime.getTime() || genesisTimestamp, now)
  // await bscStatisticService().collectStatistic(token, true, bscLatest?.datetime.getTime() || genesisTimestamp, now)
}

async function updateHourly(manager: EntityManager, token: string): Promise<void> {
  const now = Date.now()
  const ethLatest = await ethStatisticService().getHourlyStatistic({ token, network: Network.ETH }, { order: { id: 'DESC' } })
  // const bscLatest = await bscStatisticService().getHourlyStatistic({ token, network: Network.BSC }, { order: { id: 'DESC' } })

  await ethStatisticService().collectStatistic(token, false, ethLatest?.datetime.getTime() || genesisTimestamp, now)
  // await bscStatisticService().collectStatistic(token, false, bscLatest?.datetime.getTime() || genesisTimestamp, now)
}

export async function updateStatistic(): Promise<void> {
  if (!updater.needUpdate(Date.now())) {
    return
  }

  const assets = await assetService().getListedAssets()

  await getManager().transaction(async (manager: EntityManager) => {
    await bluebird.mapSeries(assets, async (asset) => {
      await updateDaily(manager, asset.token)
      await updateHourly(manager, asset.token)

      await bluebird.delay(1000)
    })
  })

  logger.info('statistic updated')
}
