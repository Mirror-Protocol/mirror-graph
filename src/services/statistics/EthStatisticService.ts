import * as bluebird from 'bluebird'
import { EntityManager } from 'typeorm'
import { uniq } from 'lodash'
import memoize from 'memoizee-decorator'
import { Repository, FindConditions, FindOneOptions, LessThanOrEqual } from 'typeorm'
import { Container, Service, Inject } from 'typedi'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { find } from 'lodash'
import { num } from 'lib/num'
import { getPairHourDatas, getPairDayDatas } from 'lib/meth'
import { AssetService, GovService } from 'services'
import { AssetDailyEntity, AssetHourlyEntity } from 'orm'
import { PeriodStatistic, ValueAt } from 'graphql/schema'
import { AssetStatus, Network } from 'types'

@Service()
export class EthStatisticService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => GovService) private readonly govService: GovService,
    @InjectRepository(AssetDailyEntity) private readonly dailyRepo: Repository<AssetDailyEntity>,
    @InjectRepository(AssetHourlyEntity) private readonly hourlyRepo: Repository<AssetHourlyEntity>,
  ) {}

  async getDailyStatistic(
    conditions: FindConditions<AssetDailyEntity>,
    options?: FindOneOptions<AssetDailyEntity>,
    repo = this.dailyRepo
  ): Promise<AssetDailyEntity> {
    return repo.findOne(conditions, options)
  }

  async getHourlyStatistic(
    conditions: FindConditions<AssetHourlyEntity>,
    options?: FindOneOptions<AssetHourlyEntity>,
    repo = this.hourlyRepo
  ): Promise<AssetHourlyEntity> {
    return repo.findOne(conditions, options)
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minute
  async today(): Promise<PeriodStatistic> {
    const datetime = new Date(Date.now() - (Date.now() % 86400000))

    const datas = await this.dailyRepo.find({ where: { datetime } })
    const transactions = datas.reduce((result, data) => result.plus(data.transactions), num(0)).toString()
    const volume = datas.reduce((result, data) => result.plus(data.volume), num(0)).toFixed(0)
    const feeVolume = num(volume).multipliedBy(0.003).toFixed(0)
    const mirVolume = num(find(datas, (data) => data.token === this.govService.get().mirrorToken)?.volume || '0').toFixed(0)

    return {
      transactions,
      volume,
      feeVolume,
      mirVolume,
      activeUsers: '0'
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minute
  async latest24h(): Promise<PeriodStatistic> {
    const assets = this.assetService.getAll({ where: { status: AssetStatus.LISTED }})

    let volume = num(0)
    let transactions = num(0)
    let mirVolume = num(0)

    await bluebird.map(assets, async (asset) => {
      const asset24h = await this.getAsset24h(asset.token)

      volume = volume.plus(asset24h.volume)
      transactions = transactions.plus(asset24h.transactions)

      if (asset.symbol === 'MIR') {
        mirVolume = num(asset24h.volume)
      }
    })

    return {
      transactions: transactions.toString(),
      volume: volume.toFixed(0),
      feeVolume: volume.multipliedBy(0.003).toFixed(0),
      mirVolume: mirVolume.toFixed(0),
      activeUsers: '0'
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minute
  async getLiquidityHistory(from: number, to: number): Promise<ValueAt[]> {
    const history = await this.dailyRepo
      .createQueryBuilder()
      .select('EXTRACT(epoch from datetime) * 1000', 'timestamp')
      .addSelect('token')
      .addSelect('liquidity')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .orderBy('datetime', 'DESC')
      .getRawMany()

    const timestamps = uniq(history.map((data) => +data.timestamp)).sort((a, b) => a - b)

    const ethAssets = this.assetService.getEthAssets()
    const tokens = Object.keys(ethAssets).map((asset) => ethAssets[asset].terraToken)

    const findLatestLiquidity = (array, token, timestamp) =>
      array.find((data) => data.token === token && +data.timestamp <= +timestamp)?.liquidity || 0

    return bluebird.mapSeries(timestamps, (timestamp) => ({
      timestamp: +timestamp,
      value: tokens
        .reduce((result, data) => result.plus(findLatestLiquidity(history, data, timestamp)), num(0))
        .toFixed(0)
    }))
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minute
  async getTradingVolumeHistory(from: number, to: number): Promise<ValueAt[]> {
    return this.dailyRepo
      .createQueryBuilder()
      .select('EXTRACT(epoch from datetime) * 1000', 'timestamp')
      .addSelect('SUM(volume)', 'value')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .groupBy('datetime')
      .orderBy('datetime', 'ASC')
      .getRawMany()
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minute
  async getAssetDayVolume(token: string, timestamp: number): Promise<string> {
    const latest = await this.getDailyStatistic(
      { token },
      {
        where: { datetime: LessThanOrEqual(timestamp) },
        order: { id: 'DESC' }
      },
    )

    return latest?.volume || '0'
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minute
  async getAsset24h(token: string): Promise<{ volume: string; transactions: string }> {
    const now = Date.now()
    const to = now - (now % 3600000)
    const from = to - 86400000

    const datas = await this.hourlyRepo
      .createQueryBuilder()
      .select('EXTRACT(epoch from datetime) * 1000', 'timestamp')
      .addSelect('volume')
      .addSelect('transactions')
      .where('token = :token', { token })
      .andWhere(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .getRawMany()

    return {
      volume: datas
        .reduce((result, data) => result.plus(data.volume), num(0))
        .toFixed(0),
      transactions: datas
        .reduce((result, data) => result.plus(data.transactions), num(0))
        .toFixed(0)
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minute
  async getAssetLiquidity(token: string): Promise<string> {
    const latest = await this.getDailyStatistic({ token }, { order: { id: 'DESC' }})

    return latest?.liquidity || '0'
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getAssetAPR(token: string): Promise<string> {
    const ethAsset = await this.assetService.getEthAsset(token)
    const ethAssetInfos = await this.assetService.getEthAssetInfos()

    return ethAssetInfos[ethAsset?.token]?.apr || '0'
  }

  async collectStatistic(manager: EntityManager, token: string, isDaily: boolean, from: number, to: number): Promise<void> {
    const repo = isDaily
      ? manager.getRepository(AssetDailyEntity)
      : manager.getRepository(AssetHourlyEntity)
    const unit = isDaily ? 86400000 : 3600000 // 1 day : 1 hour
    const maxQueryRange = unit * 1000
    const currentUTC = Date.now() - (Date.now() % unit)
    const fromUTC = Math.min(from - (from % unit), currentUTC)
    const toUTC = Math.min(to - (to % unit), currentUTC)
    const network = Network.ETH

    const ethAsset = await this.assetService.getEthAsset(token)
    const pair = ethAsset?.pair
    if (!pair) {
      return
    }

    const newEntity = (network, token, datetime) => isDaily
      ? new AssetDailyEntity({ network, token, datetime })
      : new AssetHourlyEntity({ network, token, datetime })

    for (let queryFrom = fromUTC; queryFrom <= toUTC; queryFrom += maxQueryRange) {
      const queryTo = Math.min(queryFrom + maxQueryRange, toUTC)

      const pairDatas = isDaily
        ? await getPairDayDatas(pair, queryFrom, queryTo, 1000, 'asc')
        : await getPairHourDatas(pair, queryFrom, queryTo, 1000, 'asc')

      await bluebird.mapSeries(pairDatas, async (pairData) => {
        const {
          timestamp, reserve0, reserve1, volumeToken1, transactions
        } = pairData
        const datetime = new Date(timestamp)
        const record = (await repo.findOne({ network, token, datetime }))
          || newEntity(network, token, datetime)

        record.pool = num(reserve0).multipliedBy(1000000).toFixed(0)
        record.uusdPool = num(reserve1).multipliedBy(1000000).toFixed(0)
        record.liquidity = (record.pool === '0' || record.uusdPool === '0')
          ? '0'
          : num(reserve1)
            .dividedBy(reserve0)
            .multipliedBy(reserve0)
            .plus(reserve1)
            .multipliedBy(1000000)
            .toFixed(0)

        record.volume = num(volumeToken1).multipliedBy(1000000).toFixed(0)
        record.fee = num(record.volume).multipliedBy(0.003).toFixed(0)
        record.transactions = transactions

        await manager.save(record)
      })
    }
  }
}

export function ethStatisticService(): EthStatisticService {
  return Container.get(EthStatisticService)
}
