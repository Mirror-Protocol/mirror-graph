import * as bluebird from 'bluebird'
import { convertToTimeZone } from 'date-fns-timezone'
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

  @memoize({ promise: true, maxAge: 60000 }) // 1 minute
  async today(): Promise<PeriodStatistic> {
    const datetime = convertToTimeZone(Date.now() - (Date.now() % 86400000), { timeZone: 'UTC' })

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

  @memoize({ promise: true, maxAge: 60000 * 10, preFetch: true }) // 10 minutes
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

  @memoize({ promise: true, maxAge: 60000 * 60, preFetch: true }) // 60 minutes
  async getLiquidityHistory(from: number, to: number): Promise<ValueAt[]> {
    return this.dailyRepo
      .createQueryBuilder()
      .select('EXTRACT(epoch from datetime) * 1000', 'timestamp')
      .addSelect('SUM(liquidity)', 'value')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .groupBy('datetime')
      .orderBy('datetime', 'ASC')
      .getRawMany()
  }

  @memoize({ promise: true, maxAge: 60000 * 30, preFetch: true }) // 30 minutes
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

  @memoize({ promise: true, maxAge: 60000 }) // 1 minute
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

  @memoize({ promise: true, maxAge: 60000 * 10, preFetch: true }) // 10 minutes
  async getAsset24h(token: string): Promise<{ volume: string; transactions: string }> {
    const ethAsset = await this.assetService.getEthAsset(token)
    if (!ethAsset) {
      return {
        volume: '0',
        transactions: '0'
      }
    }

    const now = Date.now()
    const to = now - (now % 3600000)
    const from = to - 86400000
    const datas = await getPairHourDatas(ethAsset.pair, from, to, 24, 'asc')

    return {
      volume: datas
        .reduce((result, data) => result.plus(data.hourlyVolumeToken1), num(0))
        .multipliedBy(1000000)
        .toFixed(0),
      transactions: datas
        .reduce((result, data) => result.plus(data.hourlyTxns), num(0))
        .toString()
    }
  }

  @memoize({ promise: true, maxAge: 60000 }) // 1 minute
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

  async collectDailyStatistic(token: string, from: number, to: number, repo = this.dailyRepo): Promise<void> {
    const todayUTC = Date.now() - (Date.now() % 86400000)
    const fromUTC = Math.min(from - (from % 86400000), todayUTC)
    const toUTC = Math.min(to - (to % 86400000), todayUTC)

    const ethAsset = await this.assetService.getEthAsset(token)
    const pair = ethAsset?.pair
    if (!pair) {
      return
    }

    let datas = []
    const records = []

    // make initial data
    const pairData = await getPairDayDatas(pair, 0, fromUTC, 1, 'desc')
    pairData[0] && datas.push(Object.assign(pairData[0], { timestamp: fromUTC }))

    // fill datas
    const maxRange = 86400000 * 100
    for (let queryFrom = fromUTC + 86400000; queryFrom <= toUTC; queryFrom += maxRange) {
      datas.push(...await getPairDayDatas(
        pair, queryFrom, Math.min(queryFrom + (maxRange - 86400000), toUTC), 1000, 'asc')
      )
    }

    // sort with desc
    datas = datas.sort((a, b) => b.timestamp - a.timestamp)

    for (let timestamp = fromUTC; timestamp <= toUTC; timestamp += 86400000) {
      const pairData = datas.find((data) => data.timestamp <= timestamp)
      if (!pairData) {
        continue
      }

      const network = Network.ETH
      const datetime = convertToTimeZone(timestamp, { timeZone: 'UTC' })
      const record = (await repo.findOne({ network, token, datetime }))
        || new AssetDailyEntity({ network, token, datetime })

      record.pool = num(pairData.reserve0).multipliedBy(1000000).toFixed(0)
      record.uusdPool = num(pairData.reserve1).multipliedBy(1000000).toFixed(0)
      record.liquidity = num(pairData.reserve1)
        .dividedBy(pairData.reserve0)
        .multipliedBy(pairData.reserve0)
        .plus(pairData.reserve1)
        .multipliedBy(1000000)
        .toFixed(0)
      record.volume = num(pairData.dailyVolumeToken1).multipliedBy(1000000).toFixed(0)
      record.fee = num(record.volume).multipliedBy(0.003).toFixed(0)
      record.transactions = pairData.dailyTxns

      records.push(record)
    }

    await repo.save(records)
  }
}

export function ethStatisticService(): EthStatisticService {
  return Container.get(EthStatisticService)
}
