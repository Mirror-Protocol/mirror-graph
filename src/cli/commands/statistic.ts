import { program } from 'commander'
import * as bluebird from 'bluebird'
import { createObjectCsvWriter } from 'csv-writer'
import { format } from 'date-fns'
import { num } from 'lib/num'
import * as logger from 'lib/logger'
import { assetService, priceService, oracleService } from 'services'
import { AssetStatus } from 'types'

export function statisticCommands(): void {
  program
    .command('assets-premium')
    .action(async () => {
      const assetList = (await assetService().getAll({
        where: { status: AssetStatus.LISTED },
        order: { symbol: 'ASC' },
      })).filter((asset) => asset.symbol !== 'MIR')

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
}
