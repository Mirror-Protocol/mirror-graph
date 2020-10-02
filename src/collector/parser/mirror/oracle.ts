import * as bluebird from 'bluebird'
import { oracleService } from 'services'
import { AssetEntity, OraclePriceEntity } from 'orm'
import { ParseArgs } from './parseArgs'

export async function parseFeedPrice(
  { manager, msg, timestamp: txTimestamp }: ParseArgs
): Promise<void> {
  const { price_infos: priceInfos } = msg['feed_price']
  const timestamp = new Date(txTimestamp).getTime()
  const repo = manager.getRepository(OraclePriceEntity)

  const entities = await bluebird
    .mapSeries(priceInfos, async (info) => {
      const token = info['asset_token']
      const price = info['price']
      const asset = await manager.findOne(AssetEntity, { token })

      return asset
        ? await oracleService().setOHLC(asset, timestamp, price, repo, false)
        : undefined
    })
    .filter(Boolean)

  await manager.save(entities)
}

export async function parse(args: ParseArgs): Promise<void> {
  if (args.msg['feed_price']) {
    return parseFeedPrice(args)
  }
}