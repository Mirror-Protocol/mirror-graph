import { program } from 'commander'
import * as bluebird from 'bluebird'
import { createObjectCsvWriter } from 'csv-writer'
import { format } from 'date-fns'
import { num } from 'lib/num'
import * as logger from 'lib/logger'
import { assetService, priceService, oracleService, ethStatisticService } from 'services'
import { AssetStatus } from 'types'
import { Not } from 'typeorm'

export function statisticCommands(): void {
  program
    .command('assets-premium')
    .action(async () => {
      const assetList = (await assetService().getAll({
        where: { status: AssetStatus.LISTED, symbol: Not('MIR') },
        order: { symbol: 'ASC' },
      }))

      const header = [{ id: 'time', title: 'time' }]
      assetList.map((asset) => {
        header.push({ id: `${asset.symbol}-SWAP`, title: `${asset.symbol}-SWAP` })
        header.push({ id: `${asset.symbol}-ORACLE`, title: `${asset.symbol}-ORACLE` })
        header.push({ id: `${asset.symbol}-PREMIUM`, title: `${asset.symbol}-PREMIUM` })
      })
      const writer = createObjectCsvWriter({ path: './result.csv', header })

      const from = new Date('2020-12-03T00:00:00.000Z').getTime()
      const to = Date.now()

      const history = {}

      await bluebird.map(assetList,async (asset) => {
        const { token } = asset

        history[token] = {
          oracle: (await oracleService().getHistory(token, from, to, 1440)).map((price) => ({ price: price.price, timestamp: +price.timestamp })),
          pool: (await priceService().getHistory(token, from, to, 1440)).map((price) => ({ price: price.price, timestamp: +price.timestamp })),
        }
      })

      for (let timestamp = from; timestamp <= to; timestamp += 1000 * 60 * 60 * 24) {
        const record = { time: format(+timestamp, 'yyyy-MM-dd HH:mm') }

        await bluebird.map(assetList, async (asset) => {
          const { symbol, token } = asset

          const poolPrice = history[token]?.pool.find((price) => +price.timestamp === +timestamp)
          const oraclePrice = history[token]?.oracle.find((price) => +price.timestamp === +timestamp)

          if (poolPrice && oraclePrice) {
            record[`${symbol}-ORACLE`] = oraclePrice.price            
            record[`${symbol}-SWAP`] = poolPrice.price            
            record[`${symbol}-PREMIUM`] = num(poolPrice.price).minus(oraclePrice.price).div(oraclePrice.price).multipliedBy(100).toFixed(2)
          }
        })

        await writer.writeRecords([record])
      }

      logger.info('completed')
    })

  program
    .command('collect-liquidity')
    .action(async () => {
      const assets = (await assetService().getAll({
        where: { status: AssetStatus.LISTED },
        order: { symbol: 'ASC' },
      }))

      await bluebird.mapSeries(assets, async (asset) => {
        const { token, symbol } = asset

        logger.info(`collect ${symbol} daily`)

        const latestDaily = await ethStatisticService().getDailyStatistic(
          { token }, { order: { id: 'DESC' }}
        )
        const fromDaily = latestDaily?.datetime.getTime() || 1606953600000
        await ethStatisticService().collectStatistic(asset.token, true, fromDaily, Date.now())

        logger.info(`collect ${symbol} hourly`)
        await bluebird.delay(1000)

        const latestHourly = await ethStatisticService().getHourlyStatistic(
          { token }, { order: { id: 'DESC' }}
        )
        const fromHourly = latestHourly?.datetime.getTime() || 1606953600000
        await ethStatisticService().collectStatistic(asset.token, false, fromHourly, Date.now())

        await bluebird.delay(1000)
      })

      logger.info('completed')
    })
}
