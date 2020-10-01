import * as bluebird from 'bluebird'
import { Container } from 'typedi'
import { OracleService } from 'services'
import { AssetEntity, OraclePriceEntity } from 'orm'
import { ParseArgs } from './types'

export async function parseFeedPrice({ manager, msg, timestamp: txTimestamp }: Partial<ParseArgs>): Promise<void> {
  const timestamp = new Date(txTimestamp).getTime()
  const { price_infos: priceInfos } = msg['feed_price']

  await bluebird.mapSeries(priceInfos, async (info) => {
    const token = info['asset_token']
    const price = info['price']
    const asset = await manager.findOne(AssetEntity, { token })
    if (!asset) {
      return
    }

    await Container.get(OracleService).setOHLC(
      asset, timestamp, price, manager.getRepository(OraclePriceEntity)
    )
  })
}

export async function parse(args: ParseArgs): Promise<void> {
  if (args.msg['feed_price']) {
    return parseFeedPrice(args)
  }
}
