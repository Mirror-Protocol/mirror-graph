import { getRepository } from 'typeorm'
import * as bluebird from 'bluebird'
import { fetchNews } from 'lib/iex'
import * as logger from 'lib/logger'
import { assetService } from 'services'
import { AssetNewsEntity } from 'orm'
import { AssetStatus } from 'types'
import { Updater } from 'lib/Updater'

const updater = new Updater(60 * 60000) // 1hour

export async function updateNews(): Promise<void> {
  if (!updater.needUpdate(Date.now())) {
    return
  }

  const assets = await assetService().getAll({ where: { status: AssetStatus.LISTED }})

  await bluebird.mapSeries(assets, async (asset) => {
    const { symbol, token } = asset
    if (symbol === 'MIR' || symbol === 'mGLXY')
      return

    const latestNews = await getRepository(AssetNewsEntity).findOne(
      { token }, { order: { datetime: 'DESC' } }
    )

    const newsList = (await fetchNews(
      symbol.substring(1), latestNews?.datetime.getTime() || 0, latestNews ? 50 : 1000)
    )
      .map((news => ({ ...news, token })))

    await getRepository(AssetNewsEntity).save(newsList)
  })

  logger.info('news updates')
}
