import * as bluebird from 'bluebird'
import memoize from 'memoizee-decorator'
import { Container, Service, Inject } from 'typedi'
import { find, sortedUniq } from 'lodash'
import { num } from 'lib/num'
import { getPairHourDatas, getPairDayDatas, getPairsDayDatas } from 'lib/meth'
import { AssetService } from 'services'
import { TodayStatistic, ValueAt } from 'graphql/schema'

@Service()
export class EthStatisticService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
  ) {}

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async today(): Promise<TodayStatistic> {
    // start of today (UTC)
    const from = Date.now() - (Date.now() % 86400000)

    const assets = this.assetService.getEthAssets()
    const pairAddresses = Object.keys(assets).map((token) => assets[token].pair)
    const datas = await getPairsDayDatas(pairAddresses, from, from)
    const transactions = datas.reduce((result, data) => result.plus(data.dailyTxns), num(0)).toString()
    const volume = datas.reduce((result, data) => result.plus(data.dailyVolumeToken1), num(0)).multipliedBy(1000000).toFixed(0)
    const feeVolume = num(volume).multipliedBy(0.003).toFixed(0)
    const mirPair = find(assets, (asset) => asset.symbol === 'MIR')?.pair.toLowerCase()
    const mirVolume = mirPair
      ? num(find(datas, (data) => data.pairAddress === mirPair)?.dailyVolumeToken1 || '0').multipliedBy(1000000).toFixed(0)
      : '0'

    return {
      transactions,
      volume,
      feeVolume,
      mirVolume,
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 60 }) // 60 minutes
  async getLiquidityHistory(from: number, to: number): Promise<ValueAt[]> {
    const assets = this.assetService.getEthAssets()
    const pairAddresses = Object.keys(assets).map((token) => assets[token].pair)
    const initialDatas = await bluebird.map(
      pairAddresses,
      async (pair) => {
        const pairData = await getPairDayDatas(pair, 0, from, 1, 'desc')
        if (pairData[0]) {
          return Object.assign(pairData[0], { timestamp: from })
        }
      }
    ).filter(Boolean)

    let datas = initialDatas
    const maxRange = 86400000 * 4
    for (let queryFrom = from + 86400000; queryFrom <= to; queryFrom += maxRange) {
      datas.push(...await getPairsDayDatas(
        pairAddresses, queryFrom, Math.min(queryFrom + (maxRange - 86400000), to)
      ))
    }
    datas = datas.sort((a, b) => b.timestamp - a.timestamp)

    const history = []
    for (let timestamp = from; timestamp <= to; timestamp += 86400000) {
      history.push({
        timestamp,
        value: pairAddresses.reduce(
          (result, pair) => {
            const pairData = datas.find((data) => data.pairAddress === pair.toLowerCase() && data.timestamp <= timestamp)
            const liquidity = pairData
              ? num(pairData.reserve1).dividedBy(pairData.reserve0).multipliedBy(pairData.reserve0).plus(pairData.reserve1)
              : num(0)

            return result.plus(liquidity)
          },
          num(0)
        ).multipliedBy(1000000).toFixed(0)
      })
    }
    return history.filter((data) => data.value !== '0')
  }

  @memoize({ promise: true, maxAge: 60000 * 30 }) // 30 minutes
  async getTradingVolumeHistory(from: number, to: number): Promise<ValueAt[]> {
    const assets = this.assetService.getEthAssets()
    const pairAddresses = Object.keys(assets).map((token) => assets[token].pair)

    const history = []
    const maxRange = 86400000 * 4
    for (let queryFrom = from; queryFrom <= to; queryFrom += maxRange) {
      const datas = await getPairsDayDatas(
        pairAddresses, queryFrom, Math.min(queryFrom + (maxRange - 86400000), to)
      )
      history.push(...sortedUniq(datas.map((data) => data.timestamp)).map((timestamp) => ({
        timestamp,
        value: datas
          .filter((data) => data.timestamp === timestamp)
          .reduce((result, data) => result.plus(data.dailyVolumeToken1), num(0)).multipliedBy(1000000).toFixed(0)
      })))
    }
    return history
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getAssetDayVolume(token: string, timestamp: number): Promise<string> {
    const ethAsset = await this.assetService.getEthAsset(token)
    if (!ethAsset) {
      return '0'
    }
    const datas = await getPairDayDatas(ethAsset.pair, timestamp, timestamp, 1, 'desc')
    return datas
      .reduce((result, data) => result.plus(data.dailyVolumeToken1), num(0))
      .multipliedBy(1000000)
      .toFixed(0)
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
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

  @memoize({ promise: true, maxAge: 60000 * 60 }) // 60 minutes
  async getAssetLiquidity(token: string): Promise<string> {
    const ethAsset = await this.assetService.getEthAsset(token)
    if (!ethAsset) {
      return '0'
    }
    const datas = await getPairDayDatas(ethAsset.pair, 0, Date.now(), 1, 'desc')
    if (!datas || datas.length < 1) {
      return '0'
    }
    const pairData = datas[0]
    return num(pairData.reserve1).dividedBy(pairData.reserve0).multipliedBy(pairData.reserve0)
      .plus(pairData.reserve1)
      .multipliedBy(1000000)
      .toFixed(0)
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getAssetAPR(token: string): Promise<string> {
    const ethAsset = await this.assetService.getEthAsset(token)
    const ethAssetInfos = await this.assetService.getEthAssetInfos()

    return ethAssetInfos[ethAsset?.token]?.apr || '0'
  }
}

export function ethStatisticService(): EthStatisticService {
  return Container.get(EthStatisticService)
}
