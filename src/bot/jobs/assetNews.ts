import { getRepository } from 'typeorm'
import * as bluebird from 'bluebird'
import { fetchNews } from 'lib/iex'
import * as logger from 'lib/logger'
import { assetService } from 'services'
import { AssetNewsEntity } from 'orm'

export async function updateNews(): Promise<void> {
  const assets = await assetService().getAll({ where: { isListed: true }})

  await bluebird.mapSeries(assets, async (asset) => {
    const { symbol, token } = asset
    if (symbol === 'MIR')
      return

    const latestNews = await getRepository(AssetNewsEntity).findOne(
      { token }, { order: { datetime: 'DESC' } }
    )

    const newsList = (await fetchNews(symbol.substring(1), latestNews?.datetime.getTime() || 0))
      .map((news => ({ ...news, token })))

    await getRepository(AssetNewsEntity).save(newsList)
  })

  logger.info('news updates')
}
