import memoize from 'memoizee-decorator'
import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service, Inject } from 'typedi'
import { getDistributionInfo, getStakingPool } from 'lib/mirror'
import { num } from 'lib/num'
import { GovService, AssetService, PriceService } from 'services'
import { DailyStatisticEntity, TxEntity, RewardEntity } from 'orm'
import { PeriodStatistic, ValueAt, APR } from 'graphql/schema'

@Service()
export class TerraStatisticService {
  constructor(
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => PriceService) private readonly priceService: PriceService,
    @InjectRepository(DailyStatisticEntity)
    private readonly dailyRepo: Repository<DailyStatisticEntity>,
    @InjectRepository(TxEntity) private readonly txRepo: Repository<TxEntity>,
    @InjectRepository(RewardEntity) private readonly rewardRepo: Repository<RewardEntity>
  ) {}

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minute
  async today(): Promise<PeriodStatistic> {
    const from = Date.now() - (Date.now() % 86400000)
    const to = from + 86400000

    const txs = await this.txRepo
      .createQueryBuilder()
      .select('COUNT(id)', 'count')
      .addSelect('COUNT(DISTINCT address)', 'users')
      .addSelect('SUM(commission_value)', 'commission')
      .addSelect('SUM(volume)', 'volume')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .getRawOne()

    const mir = await this.txRepo
      .createQueryBuilder()
      .select('SUM(volume)', 'volume')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .andWhere('token = :token', { token: this.govService.get().mirrorToken })
      .getRawOne()

    return {
      transactions: txs?.count || '0',
      volume: txs?.volume || '0',
      feeVolume: txs?.commission || '0',
      mirVolume: mir?.volume || '0',
      activeUsers: txs?.users || '0'
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minute
  async latest24h(): Promise<PeriodStatistic> {
    const to = Date.now()
    const from = to - 86400000

    const txs = await this.txRepo
      .createQueryBuilder()
      .select('COUNT(id)', 'count')
      .addSelect('COUNT(DISTINCT address)', 'users')
      .addSelect('SUM(commission_value)', 'commission')
      .addSelect('SUM(volume)', 'volume')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .getRawOne()

    const mir = await this.txRepo
      .createQueryBuilder()
      .select('SUM(volume)', 'volume')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .andWhere('token = :token', { token: this.govService.get().mirrorToken })
      .getRawOne()

    return {
      transactions: txs?.count || '0',
      volume: txs?.volume || '0',
      feeVolume: txs?.commission || '0',
      mirVolume: mir?.volume || '0',
      activeUsers: txs?.users || '0'
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minute
  async getLiquidityHistory(from: number, to: number): Promise<ValueAt[]> {
    return this.dailyRepo
      .createQueryBuilder()
      .select('extract(epoch from datetime) * 1000', 'timestamp')
      .addSelect('cumulative_liquidity', 'value')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .orderBy('datetime', 'ASC')
      .getRawMany()
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minute
  async getTradingVolumeHistory(from: number, to: number): Promise<ValueAt[]> {
    return this.dailyRepo
      .createQueryBuilder()
      .select('extract(epoch from datetime) * 1000', 'timestamp')
      .addSelect('trading_volume', 'value')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .orderBy('datetime', 'ASC')
      .getRawMany()
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minute
  async getAssetDayVolume(token: string, timestamp: number): Promise<string> {
    const from = timestamp
    const to = from + 86400000
    const txs = await this.txRepo
      .createQueryBuilder()
      .select('sum(volume)', 'volume')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .andWhere('token = :token', { token })
      .getRawOne()

    return txs?.volume || '0'
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minute
  async getAsset24h(token: string): Promise<{ volume: string; transactions: string }> {
    const from = Date.now() - (60000 * 60 * 24)
    const to = Date.now()
    const txs = await this.txRepo
      .createQueryBuilder()
      .select('sum(volume)', 'volume')
      .addSelect('count(id)', 'count')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .andWhere('token = :token', { token })
      .getRawOne()

    return {
      volume: txs?.volume || '0',
      transactions: txs?.count || '0',
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minute
  async getAssetLiquidity(token: string): Promise<string> {
    const asset = await this.assetService.get({ token })
    const price = await this.priceService.getPrice(token)
    if (!asset || !price || asset.positions.uusdPool === '0' || asset.positions.pool === '0') {
      return '0'
    }
    return num(asset.positions.uusdPool).dividedBy(asset.positions.pool).multipliedBy(asset.positions.pool)
      .plus(asset.positions.uusdPool)
      .toFixed(0)
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getAnnualRewardTable(): Promise<{ [token: string]: string }> {
    // genesis(2020.12.04 04:00 KST) + 6hours
    const DISTRIBUTE_START = 1607022000000 + (60000 * 60 * 6)
    const ONE_YEAR = 60000 * 60 * 24 * 365

    const distributionSchedule = [
      [               DISTRIBUTE_START, ONE_YEAR * 1 + DISTRIBUTE_START, '54900000000000'],
      [ONE_YEAR * 1 + DISTRIBUTE_START, ONE_YEAR * 2 + DISTRIBUTE_START, '27450000000000'],
      [ONE_YEAR * 2 + DISTRIBUTE_START, ONE_YEAR * 3 + DISTRIBUTE_START, '13725000000000'],
      [ONE_YEAR * 3 + DISTRIBUTE_START, ONE_YEAR * 4 + DISTRIBUTE_START,  '6862500000000'],
    ]

    const now = Date.now()
    const schedule = distributionSchedule.find((schedule) => now >= schedule[0] && now <= schedule[1])
    const reward = Array.isArray(schedule) ? schedule[2] : '0'

    const { weights } = await getDistributionInfo(this.govService.get().factory)
    if (reward === '0' || !weights) {
      return {}
    }
    const totalWeight = weights.reduce((result, data) => result.plus(data[1]), num(0))
    const getTokenReward = (weight) => num(reward).multipliedBy(num(weight).dividedBy(totalWeight))

    return weights
      .filter((data) => num(data[1]).isGreaterThan(0))
      .reduce(
        (result, data) => Object.assign(result, {
          [data[0]]: getTokenReward(data[1]).toFixed(0)
        }),
        {}
      )
  }

  @memoize({ promise: true, maxAge: 60000, preFetch: true }) // 1 minute
  async getAssetAPR(token: string): Promise<APR> {
    const asset = await this.assetService.get({ token })
    const { mirrorToken, staking } = this.govService.get()
    const { positions } = asset

    const mirPrice = await this.priceService.getPrice(mirrorToken)
    const liquidityValue = num(positions.uusdPool)
      .dividedBy(positions.pool)
      .multipliedBy(positions.pool)
      .plus(positions.uusdPool)
    const poolValue = liquidityValue
      .multipliedBy(num(positions.lpStaked).dividedBy(positions.lpShares))
 
    const annualReward = (await this.getAnnualRewardTable())[token]
    if (
      !annualReward || annualReward === '0' || !mirPrice || mirPrice === '0' || poolValue.isNaN() || liquidityValue.isNaN()
    ) {
      return { long: '0', short: '0' }
    }

    const { shortRewardWeight } = await getStakingPool(staking, token)
    const longReward = num(annualReward).multipliedBy(num(1).minus(shortRewardWeight || 0))
    const shortReward = num(annualReward).multipliedBy(shortRewardWeight)

    // (Annual MIR reward * MIR price) / (liquidity value * (staked lp share/total lp share))
    return {
      long: longReward.multipliedBy(mirPrice).dividedBy(poolValue).toFixed(3),
      short: shortReward.multipliedBy(mirPrice).dividedBy(poolValue).toFixed(3),
    }
  }
}

export function terraStatisticService(): TerraStatisticService {
  return Container.get(TerraStatisticService)
}
