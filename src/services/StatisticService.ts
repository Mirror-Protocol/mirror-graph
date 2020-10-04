import * as bluebird from 'bluebird'
import { Container, Service, Inject } from 'typedi'
import { num } from 'lib/num'
import { AssetService, OracleService } from 'services'
import config from 'config'

@Service()
export class StatisticService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => OracleService) private readonly oracleService: OracleService,
  ) {}

  async assetMarketCap(): Promise<string> {
    const assets = await this.assetService.getAll()
    let value = num(0)

    await bluebird.map(
      assets.filter((asset) => num(asset.position.mint).isGreaterThan(0)),
      async (asset) => {
        const price = await this.oracleService.getPrice(asset)
        if (!price)
          return

        value = value.plus(num(asset.position.mint).multipliedBy(price))
      }
    )

    return value.toFixed(config.DECIMALS)
  }

  async totalValueLocked(): Promise<string> {
    const assets = await this.assetService.getAll()
    let value = num(0)

    await bluebird.map(
      assets.filter((asset) => num(asset.position.asCollateral).isGreaterThan(0)),
      async (asset) => {
        if (asset.token !== 'uusd') {
          const price = await this.oracleService.getPrice(asset)
          if (!price)
            return

          value = value.plus(num(asset.position.asCollateral).multipliedBy(price))
        } else {
          value = value.plus(asset.position.asCollateral)
        }
      }
    )

    return value.toFixed(config.DECIMALS)
  }

}

export function statisticService(): StatisticService {
  return Container.get(StatisticService)
}
