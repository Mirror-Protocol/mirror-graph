import { addDays } from 'date-fns'
import * as bluebird from 'bluebird'
import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service, Inject } from 'typedi'
import { num } from 'lib/num'
import { GovService, AssetService, PriceService, OracleService, govService } from 'services'
import { DailyStatisticEntity, TxEntity, RewardEntity } from 'orm'
import { Statistic, ValueAt } from 'graphql/schema'

@Service()
export class StatisticService {
  constructor(
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => PriceService) private readonly priceService: PriceService,
    @Inject((type) => OracleService) private readonly oracleService: OracleService,
    @InjectRepository(DailyStatisticEntity) private readonly dailyRepo: Repository<DailyStatisticEntity>,
    @InjectRepository(TxEntity) private readonly txRepo: Repository<TxEntity>,
    @InjectRepository(RewardEntity) private readonly rewardRepo: Repository<RewardEntity>,
  ) {}

  async statistic(): Promise<Partial<Statistic>> {
    const assets = await this.assetService.getAll()
    let assetMarketCap = num(0)
    let totalValueLocked = num(0)

    await bluebird.map(assets, async (asset) => {
      if (asset.token === 'uusd') {
        totalValueLocked = totalValueLocked.plus(asset.positions.asCollateral)
        return
      }

      const price = await this.oracleService.getPrice(asset.token)
      if (!price)
        return

      assetMarketCap = assetMarketCap.plus(num(asset.positions.mint).multipliedBy(price))
      totalValueLocked = totalValueLocked.plus(num(asset.positions.asCollateral).multipliedBy(price))
    })

    const to = Date.now()
    const from = addDays(to, -1).getTime()

    const txs24h = await this.txRepo
      .createQueryBuilder()
      .select('count(id)', 'count')
      .addSelect('sum(fee_value)', 'fee')
      .addSelect('sum(volume)', 'volume')
      .where('datetime BETWEEN :from AND :to', { from: new Date(from), to: new Date(to) })
      .getRawOne()

    const mir24h = await this.txRepo
      .createQueryBuilder()
      .select('sum(volume)', 'volume')
      .where('datetime BETWEEN :from AND :to', { from: new Date(from), to: new Date(to) })
      .andWhere('token = :token', { token: this.govService.get().mirrorToken })
      .getRawOne()

    return {
      assetMarketCap: assetMarketCap.toFixed(0),
      totalValueLocked: totalValueLocked.toFixed(0),
      collateralRatio: totalValueLocked.dividedBy(assetMarketCap).multipliedBy(100).toFixed(2),
      transactions24h: txs24h?.count || '0',
      feeValue24h: txs24h?.fee || '0',
      tradingVolume24h: txs24h?.volume || '0',
      mirVolume24h: mir24h?.volume || '0',
    }
  }

  async addDailyTradingVolume(
    timestamp: number, volume: string, repo = this.dailyRepo
  ): Promise<DailyStatisticEntity> {
    const datetime = new Date(timestamp - (timestamp % 86400000))
    let daily = await repo.findOne({ datetime })

    if (daily) {
      daily.tradingVolume = num(daily.tradingVolume).plus(volume).toString()
    } else {
      daily = new DailyStatisticEntity({
        gov: govService().get(), datetime, tradingVolume: volume
      })
    }

    return repo.save(daily)
  }

  async calculateDailyCumulativeLiquidity(timestamp: number, repo = this.dailyRepo): Promise<DailyStatisticEntity> {
    const datetime = new Date(timestamp - (timestamp % 86400000))
    const assets = await this.assetService.getAll()
    let liquidityValue = num(0)

    await bluebird.map(
      assets.filter((asset) => asset.token !== 'uusd'),
      async (asset) => {
        const price = await this.oracleService.getPrice(asset.token)
        if (!price)
          return

        liquidityValue = liquidityValue
          .plus(num(asset.positions.liquidity).multipliedBy(price))
          .plus(asset.positions.uusdLiquidity)
      }
    )

    const daily = (await repo.findOne({ datetime }))
      || new DailyStatisticEntity({ gov: govService().get(), datetime })

    daily.cumulativeLiquidity = liquidityValue.toString()

    return repo.save(daily)
  }

  async getLiquidityHistory(from: number, to: number): Promise<ValueAt[]> {
    return this.dailyRepo
      .createQueryBuilder()
      .select('datetime', 'timestamp')
      .addSelect('cumulative_liquidity', 'value')
      .where('datetime BETWEEN :from AND :to', { from: new Date(from), to: new Date(to) })
      .orderBy('datetime', 'ASC')
      .getRawMany()
  }

  async getTradingVolumeHistory(from: number, to: number): Promise<ValueAt[]> {
    return this.dailyRepo
      .createQueryBuilder()
      .select('datetime', 'timestamp')
      .addSelect('trading_volume', 'value')
      .where('datetime BETWEEN :from AND :to', { from: new Date(from), to: new Date(to) })
      .orderBy('datetime', 'ASC')
      .getRawMany()
  }

  async getAssetTradingVolume24h(token: string): Promise<string> {
    const to = Date.now()
    const from = addDays(to, -1).getTime()

    const txs24h = await this.txRepo
      .createQueryBuilder()
      .select('sum(volume)', 'volume')
      .where('datetime BETWEEN :from AND :to', { from: new Date(from), to: new Date(to) })
      .andWhere('token = :token', { token })
      .getRawOne()

    return txs24h?.volume || '0'
  }

  async getAssetAPR(token: string): Promise<string> {
    const asset = await this.assetService.get({ token })

    const to = Date.now()
    const from = addDays(to, -1).getTime()

    const price = await this.priceService.getPrice(token)
    const mirPrice = await this.priceService.getPrice(this.govService.get().mirrorToken)
    const reward24h = (await this.rewardRepo
      .createQueryBuilder()
      .select('sum(amount)', 'amount')
      .where('datetime BETWEEN :from AND :to', { from: new Date(from), to: new Date(to) })
      .andWhere('token = :token', { token })
      .getRawOne())?.amount
    const liquidityValue = num(asset.positions.liquidity)
      .multipliedBy(price)
      .plus(asset.positions.uusdLiquidity)

    if (!reward24h || !mirPrice || !price)
      return '0'

    const mirValue = num(reward24h).multipliedBy(mirPrice).multipliedBy(365)
    const poolValue = liquidityValue.multipliedBy(num(asset.positions.lpStaked).dividedBy(asset.positions.lpShares))

    // (24h MIR reward * MIR price * 365) / (liquidity value * (staked lp share/total lp share))
    const apr = mirValue.dividedBy(poolValue)

    return apr.isNaN() ? '0' : apr.toString()
  }
}

export function statisticService(): StatisticService {
  return Container.get(StatisticService)
}
