import memoize from 'memoizee-decorator'
import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service, Inject } from 'typedi'
import { num } from 'lib/num'
import { getMIRAnnualRewards } from 'lib/utils'
import { GovService, AssetService, PriceService } from 'services'
import { DailyStatisticEntity, TxEntity } from 'orm'
import { PeriodStatistic, ValueAt } from 'graphql/schema'

@Service()
export class TerraStatisticService {
  constructor(
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => PriceService) private readonly priceService: PriceService,
    @InjectRepository(DailyStatisticEntity)
    private readonly dailyRepo: Repository<DailyStatisticEntity>,
    @InjectRepository(TxEntity) private readonly txRepo: Repository<TxEntity>,
  ) {}

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async today(): Promise<PeriodStatistic> {
    const from = Date.now() - (Date.now() % 86400000)
    const to = from + 86400000

    const txs = await this.txRepo
      .createQueryBuilder()
      .select('count(id)', 'count')
      .addSelect('sum(commission_value)', 'commission')
      .addSelect('sum(volume)', 'volume')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .getRawOne()

    const mir = await this.txRepo
      .createQueryBuilder()
      .select('sum(volume)', 'volume')
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
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async latest24h(): Promise<PeriodStatistic> {
    const to = Date.now()
    const from = to - 86400000

    const txs = await this.txRepo
      .createQueryBuilder()
      .select('count(id)', 'count')
      .addSelect('sum(commission_value)', 'commission')
      .addSelect('sum(volume)', 'volume')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .getRawOne()

    const mir = await this.txRepo
      .createQueryBuilder()
      .select('sum(volume)', 'volume')
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
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
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

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
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

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
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

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
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

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getAssetLiquidity(token: string): Promise<string> {
    const asset = await this.assetService.get({ token })
    const price = await this.priceService.getPrice(token)
    if (!asset || !price) {
      return '0'
    }
    return num(asset.positions.uusdPool).dividedBy(asset.positions.pool).multipliedBy(asset.positions.pool)
      .plus(asset.positions.uusdPool)
      .toFixed(0)
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getAssetAPR(token: string): Promise<string> {
    const asset = await this.assetService.get({ token })
    const { mirrorToken } = this.govService.get()

    const mirPrice = await this.priceService.getPrice(mirrorToken)
    const positions = asset.positions
    const liquidityValue = num(positions.uusdPool)
      .dividedBy(positions.pool)
      .multipliedBy(positions.pool)
      .plus(asset.positions.uusdPool)
    const rewardPerYear = getMIRAnnualRewards(Date.now(), token === mirrorToken)

    if (!rewardPerYear || !mirPrice) return '0'

    const mirValue = num(rewardPerYear).multipliedBy(1000000).multipliedBy(mirPrice)
    const poolValue = liquidityValue.multipliedBy(
      num(asset.positions.lpStaked).dividedBy(asset.positions.lpShares)
    )

    // (24h MIR reward * MIR price * 365) / (liquidity value * (staked lp share/total lp share))
    const apr = mirValue.dividedBy(poolValue)

    return apr.isNaN() ? '0' : apr.toString()
  }
}

export function terraStatisticService(): TerraStatisticService {
  return Container.get(TerraStatisticService)
}
