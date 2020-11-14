import { program } from 'commander'
import { getRepository } from 'typeorm'
import { addMinutes, addDays, startOfDay } from 'date-fns'
import * as bluebird from 'bluebird'
import * as logger from 'lib/logger'
import { fetchAggregates, TimeSpan } from 'lib/polygon'
import { assetService, priceService } from 'services'
import { AssetEntity, PriceEntity } from 'orm'
import { AssetStatus } from 'types'

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

async function fillPriceHistory(asset: AssetEntity): Promise<void> {
  const symbol = asset.symbol.substring(1)
  const price = await priceService().get({ token: asset.token }, { order: { id: 'ASC' }})

  const minFrom = startOfDay(addDays(price.datetime, -1)).getTime()
  const minTo = addMinutes(price.datetime, -1).getTime()
  const hourFrom = startOfDay(addDays(minFrom, -7)).getTime()
  const hourTo = minFrom
  const dayFrom = startOfDay(new Date('2015-01-01')).getTime()
  const dayTo = hourFrom

  // collect ohlc of days
  await collectPrice(symbol, asset.token, TimeSpan.DAY, dayFrom, dayTo, true)
  // collect ohlc of hours
  await collectPrice(symbol, asset.token, TimeSpan.HOUR, hourFrom, hourTo)
  // collect ohlc of minutes
  await collectPrice(symbol, asset.token, TimeSpan.MINUTE, minFrom, minTo)
}

async function fillPriceHistoryAll(): Promise<void> {
  const assets = await assetService().getAll({ where: { status: AssetStatus.LISTED }})

  await bluebird.mapSeries(assets, async (asset) => {
    if (asset.symbol === 'MIR')
      return

    await fillPriceHistory(asset)
  })
}

export function fillCommands(): void {
  program
    .command('fill-price-history <symbol>')
    .action(async (symbol: string) => {
      if (symbol === 'all') {
        await fillPriceHistoryAll()
      } else {
        const asset = await assetService().get({ symbol })
        await fillPriceHistory(asset)
      }

      logger.info('completed')
    })
}
