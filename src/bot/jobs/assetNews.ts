import { getRepository, Not, In } from 'typeorm'
import * as bluebird from 'bluebird'
import { fetchNews } from 'lib/iex'
import * as logger from 'lib/logger'
import { assetService } from 'services'
import { AssetNewsEntity } from 'orm'
import { Updater } from 'lib/Updater'

const updater = new Updater(60 * 60000 * 6) // 6 hours

export async function updateNews(): Promise<void> {
  // update only columbus
  if (!process.env.TERRA_CHAIN_ID.includes('columbus')) {
    return
  }

  if (!updater.needUpdate(Date.now())) {
    return
  }

  const blacklist = ['MIR', 'mGLXY', 'mDOT']
  const assets = await assetService().getListedAssets({ symbol: Not(In(blacklist)) })

  await bluebird.mapSeries(assets, async (asset) => {
    const { symbol, token } = asset

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
