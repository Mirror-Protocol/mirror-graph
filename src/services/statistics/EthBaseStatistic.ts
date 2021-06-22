import * as bluebird from 'bluebird'
import memoize from 'memoizee-decorator'
import { Repository, FindConditions, FindOneOptions, getRepository } from 'typeorm'
import { find, uniq } from 'lodash'
import { num } from 'lib/num'
import { EthPairStatisticData } from 'lib/eth'
import { govService } from 'services'
import { AssetDailyEntity, AssetHourlyEntity } from 'orm'
import { PeriodStatistic, TVL, ValueAt } from 'graphql/schema'
import { Network, EthAssets, EthAsset, EthAssetInfos } from 'types'

export class EthBaseStatistic {
  dailyRepo: Repository<AssetDailyEntity>
  hourlyRepo: Repository<AssetHourlyEntity>
  network: Network
  tradingFeeRate = 0.003

  constructor() {
    this.dailyRepo = getRepository(AssetDailyEntity)
    this.hourlyRepo = getRepository(AssetHourlyEntity)
  }

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

  getAssets(): EthAssets {
    return undefined
  }

  getAsset(token: string): EthAsset {
    return find(this.getAssets(), (ethAsset) => ethAsset.terraToken === token)
  }

  async getAssetInfos(): Promise<EthAssetInfos> {
    return undefined
  }

  async getPairDayDatas(
    pair: string, from: number, to: number, limit: number, orderDirection: string
  ): Promise<EthPairStatisticData[]> {
    return []
  }

  async getPairHourDatas(
    pair: string, from: number, to: number, limit: number, orderDirection: string
  ): Promise<EthPairStatisticData[]> {
    return []
  }

  async getAssetSupply(token: string): Promise<string> {
    return '0'
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async totalValueLocked(): Promise<TVL> {
    const assets = this.getAssets()
    let liquidity = '0'

    await bluebird.map(Object.keys(assets), async (ethToken) => {
      const terraToken = assets[ethToken].terraToken
      const assetLiquidity = await this.getAssetLiquidity(terraToken)

      liquidity = num(liquidity).plus(assetLiquidity).toFixed(0)
    })

    return {
      total: liquidity,
      liquidity: liquidity,
      collateral: '0',
      stakedMir: '0',
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async assetMarketCap(token?: string): Promise<string> {
    let assetMarketCap = num(0)

    if (!token) {
      const assets = this.getAssets()

      await bluebird.map(Object.keys(assets).filter((token) => assets[token]?.symbol !== 'MIR'), async (token) => {
        const { terraToken } = assets[token]

        const price = await this.getAssetPrice(terraToken)
        const supply = num(await this.getAssetSupply(terraToken))

        assetMarketCap = assetMarketCap.plus(supply.multipliedBy(price))
      })
    } else {
      const asset = this.getAsset(token)
      const { terraToken } = asset

      const price = await this.getAssetPrice(terraToken)
      const supply = num(await this.getAssetSupply(terraToken))

      assetMarketCap = assetMarketCap.plus(supply.multipliedBy(price))
    }

    return assetMarketCap.toFixed(0)
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async today(): Promise<PeriodStatistic> {
    const datetime = new Date(Date.now() - (Date.now() % 86400000))

    const datas = await this.dailyRepo.find({ where: { datetime, network: this.network } })
    const transactions = datas.reduce((result, data) => result.plus(data.transactions), num(0)).toString()
    const volume = datas.reduce((result, data) => result.plus(data.volume), num(0)).toFixed(0)
    const feeVolume = num(volume).multipliedBy(this.tradingFeeRate).toFixed(0)
    const mirVolume = num(find(datas, (data) => data.token === govService().get().mirrorToken)?.volume || '0').toFixed(0)

    return {
      transactions,
      volume,
      feeVolume,
      mirVolume,
      activeUsers: '0'
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async latest24h(): Promise<PeriodStatistic> {
    const assets = this.getAssets()

    let volume = num(0)
    let transactions = num(0)
    let mirVolume = num(0)

    await bluebird.map(Object.keys(assets), async (ethToken) => {
      const { terraToken, symbol } = assets[ethToken]
      const asset24h = await this.getAsset24h(terraToken)

      volume = volume.plus(asset24h.volume)
      transactions = transactions.plus(asset24h.transactions)

      if (symbol === 'MIR') {
        mirVolume = num(asset24h.volume)
      }
    })

    return {
      transactions: transactions.toString(),
      volume: volume.toFixed(0),
      feeVolume: volume.multipliedBy(this.tradingFeeRate).toFixed(0),
      mirVolume: mirVolume.toFixed(0),
      activeUsers: '0'
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getLiquidityHistory(from: number, to: number): Promise<ValueAt[]> {
    const history = await this.dailyRepo
      .createQueryBuilder()
      .select('EXTRACT(epoch from datetime) * 1000', 'timestamp')
      .addSelect('token')
      .addSelect('liquidity')
      .where('network = :network', { network: this.network })
      .andWhere(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .orderBy('datetime', 'DESC')
      .getRawMany()

    const timestamps = uniq(history.map((data) => +data.timestamp)).sort((a, b) => a - b)

    const ethAssets = this.getAssets()
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

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getTradingVolumeHistory(from: number, to: number): Promise<ValueAt[]> {
    return this.dailyRepo
      .createQueryBuilder()
      .select('EXTRACT(epoch from datetime) * 1000', 'timestamp')
      .addSelect('SUM(volume)', 'value')
      .where('network = :network', { network: this.network })
      .andWhere(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .groupBy('datetime')
      .orderBy('datetime', 'ASC')
      .getRawMany()
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getAssetDayVolume(token: string, timestamp: number): Promise<string> {
    const datetime = new Date(timestamp - (timestamp % 86400000))
    const latest = await this.getDailyStatistic(
      { token },
      {
        where: { network: this.network, datetime },
        order: { id: 'DESC' }
      },
    )

    return latest?.volume || '0'
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
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
      .andWhere('network = :network', { network: this.network })
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

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getAssetLiquidity(token: string): Promise<string> {
    const latest = await this.getDailyStatistic(
      { token, network: this.network }, { order: { id: 'DESC' }}
    )

    return latest?.liquidity || '0'
  }

  @memoize({ promise: true, maxAge: 60000 }) // 1 minute
  async getAssetPrice(token: string): Promise<string> {
    const latest = await this.getHourlyStatistic(
      { token, network: this.network }, { order: { id: 'DESC' }}
    )
    if (!latest) {
      return '0'
    }

    const { pool, uusdPool } = latest

    return num(uusdPool).dividedBy(pool).toString()
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getAssetAPR(token: string): Promise<string> {
    const asset = this.getAsset(token)
    const assetInfos = await this.getAssetInfos()

    return assetInfos[asset?.token]?.apr || '0'
  }

  async collectStatistic(token: string, isDaily: boolean, from: number, to: number): Promise<void> {
    const network = this.network
    const repo = isDaily ? this.dailyRepo : this.hourlyRepo
    const unit = isDaily ? 86400000 : 3600000 // 1 day : 1 hour
    const maxQueryRange = unit * 1000
    const currentUTC = Date.now() - (Date.now() % unit)
    const fromUTC = Math.min(from - (from % unit), currentUTC)
    const toUTC = Math.min(to - (to % unit), currentUTC)

    const ethAsset = this.getAsset(token)
    const pair = ethAsset?.pair
    if (!pair) {
      return
    }

    const records = []
    const newEntity = (network, token, datetime) => isDaily
      ? new AssetDailyEntity({ network, token, datetime })
      : new AssetHourlyEntity({ network, token, datetime })

    for (let queryFrom = fromUTC; queryFrom <= toUTC; queryFrom += maxQueryRange) {
      const queryTo = Math.min(queryFrom + maxQueryRange, toUTC)

      const pairDatas = isDaily
        ? await this.getPairDayDatas(pair, queryFrom, queryTo, 1000, 'asc')
        : await this.getPairHourDatas(pair, queryFrom, queryTo, 1000, 'asc')

      await bluebird.mapSeries(pairDatas, async (pairData) => {
        const {
          timestamp, reserve0, reserve1, volumeToken1, transactions
        } = pairData
        const datetime = new Date(timestamp)
        const record = (await repo.findOne({ network, token, datetime }))
          || newEntity(network, token, datetime)

        record.pool = num(reserve0).multipliedBy(1000000).toFixed(0)
        record.uusdPool = num(reserve1).multipliedBy(1000000).toFixed(0)
        record.liquidity = num(reserve1)
          .dividedBy(reserve0)
          .multipliedBy(reserve0)
          .plus(reserve1)
          .multipliedBy(1000000)
          .toFixed(0)

        record.volume = num(volumeToken1).multipliedBy(1000000).toFixed(0)
        record.fee = num(record.volume).multipliedBy(this.tradingFeeRate).toFixed(0)
        record.transactions = transactions

        records.push(record)
      })
    }

    await repo.save(records)
  }
}
