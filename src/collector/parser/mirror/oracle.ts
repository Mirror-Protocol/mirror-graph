import * as bluebird from 'bluebird'
import { oracleService } from 'services'
import { OraclePriceEntity } from 'orm'
import { ParseArgs } from './parseArgs'

export async function parseFeedPrice(
  { manager, msg, timestamp: txTimestamp }: ParseArgs
): Promise<void> {
  const { prices } = msg['feed_price']
  const timestamp = new Date(txTimestamp).getTime()
  const repo = manager.getRepository(OraclePriceEntity)

  const entities = await bluebird
    .mapSeries(prices, async (priceInfo) => {
      const token = priceInfo[0]
      const price = priceInfo[1]

      return oracleService().setOHLC(token, timestamp, price, repo, false)
    })
    .filter(Boolean)

  await manager.save(entities)
}

export async function parse(args: ParseArgs): Promise<void> {
  if (args.msg['feed_price']) {
    return parseFeedPrice(args)
  }
}
