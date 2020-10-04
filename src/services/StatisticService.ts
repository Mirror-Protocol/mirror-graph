import * as bluebird from 'bluebird'
import { Container, Service, Inject } from 'typedi'
import { num } from 'lib/num'
import { AssetService, OracleService } from 'services'
import config from 'config'
import { Statistic } from 'graphql/schema'

@Service()
export class StatisticService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => OracleService) private readonly oracleService: OracleService,
  ) {}

  async statistic(): Promise<Statistic> {
    const assets = await this.assetService.getAll()
    let assetMarketCap = num(0)
    let totalValueLocked = num(0)

    await bluebird.map(assets, async (asset) => {
      if (asset.token === 'uusd') {
        totalValueLocked = totalValueLocked.plus(asset.positions.asCollateral)
        return
      }

      const price = await this.oracleService.getPrice(asset)
      if (!price)
        return

      assetMarketCap = assetMarketCap.plus(num(asset.positions.mint).multipliedBy(price))
      totalValueLocked = totalValueLocked.plus(num(asset.positions.asCollateral).multipliedBy(price))
    })

    return {
      assetMarketCap: assetMarketCap.toFixed(config.DECIMALS),
      totalValueLocked: totalValueLocked.toFixed(config.DECIMALS),
      collateralRatio: totalValueLocked.dividedBy(assetMarketCap).multipliedBy(100).toFixed(2),
    }
  }

}

export function statisticService(): StatisticService {
  return Container.get(StatisticService)
}
