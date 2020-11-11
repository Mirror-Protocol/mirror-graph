import { program } from 'commander'
import { getRepository } from 'typeorm'
import { addMinutes, addDays, startOfDay } from 'date-fns'
import * as bluebird from 'bluebird'
import * as logger from 'lib/logger'
import { fetchAggregates, TimeSpan } from 'lib/polygon'
import { assetService, priceService } from 'services'
import { PriceEntity, AssetEntity } from 'orm'
import { AssetStatus } from 'types'
import { loadDescriptions } from 'lib/data'

async function collectPrice(
  symbol: string, token: string, timespan: TimeSpan, from: number, to: number, useOnlyDay = false
): Promise<void> {
  logger.info(`collect price: ${symbol}, timespan: ${timespan}`)
  const ohlcs = await fetchAggregates(symbol, timespan, from, to)

  await bluebird.mapSeries(ohlcs, async (ohlc) => {
    const timestamp = useOnlyDay ? startOfDay(ohlc.timestamp) : ohlc.timestamp

    const { open, high, low, close } = ohlc
    const priceEntity = new PriceEntity({
      token, open, high, low, close, datetime: new Date(timestamp)
    })

    await getRepository(PriceEntity).save(priceEntity)
  })
}

async function fillPriceHistory(): Promise<void> {
  const assets = await assetService().getAll({ where: { status: AssetStatus.LISTED }})
  const price = await priceService().get(undefined, { order: { id: 'ASC' }})
  const minFrom = startOfDay(addDays(price.datetime, -1)).getTime()
  const minTo = addMinutes(price.datetime, -1).getTime()
  const hourFrom = startOfDay(addDays(minFrom, -7)).getTime()
  const hourTo = minFrom
  const dayFrom = startOfDay(new Date('2015-01-01')).getTime()
  const dayTo = hourFrom

  await bluebird.mapSeries(assets, async (asset) => {
    if (asset.symbol === 'MIR')
      return

    const symbol = asset.symbol.substring(1)
    // collect ohlc of days
    await collectPrice(symbol, asset.token, TimeSpan.DAY, dayFrom, dayTo, true)
    // collect ohlc of hours
    await collectPrice(symbol, asset.token, TimeSpan.HOUR, hourFrom, hourTo)
    // collect ohlc of minutes
    await collectPrice(symbol, asset.token, TimeSpan.MINUTE, minFrom, minTo)
  })
}

export function fillCommands(): void {
  program
    .command('fill-price-history')
    .action(async () => {
      await fillPriceHistory()

      logger.info('completed')
    })

  program
    .command('fill-description')
    .action(async () => {
      const descriptions = loadDescriptions()

      await bluebird.map(Object.keys(descriptions), async (symbol) => {
        await getRepository(AssetEntity)
          .update({ symbol: `m${symbol}` }, { description: descriptions[symbol] })
      })

      logger.info('completed')
    })
}
