import * as bluebird from 'bluebird'
import memoize from 'memoizee-decorator'
import { Container, Service } from 'typedi'
import { ethers } from 'ethers'
import { getPairHourDatas, getPairDayDatas, totalSupply } from 'lib/bsc'
import { EthPairStatisticData } from 'lib/eth'
import { num } from 'lib/num'
import { bscService } from 'services'
import { Network, EthAssets } from 'types'
import { EthBaseStatistic } from './EthBaseStatistic'

@Service()
export class BscStatisticService extends EthBaseStatistic {
  constructor() {
    super()

    this.network = Network.BSC
    this.tradingFeeRate = 0.002
  }

  getAssets(): EthAssets {
    return bscService().getAssets()
  }

  async getAssetAPR(token: string): Promise<string> {
    return '0'
  }

  async getPairDayDatas(
    pair: string, from: number, to: number, limit: number, orderDirection: string
  ): Promise<EthPairStatisticData[]> {
    return getPairDayDatas(pair, from, to, limit, orderDirection)
  }

  async getPairHourDatas(
    pair: string, from: number, to: number, limit: number, orderDirection: string
  ): Promise<EthPairStatisticData[]> {
    return getPairHourDatas(pair, from, to, limit, orderDirection)
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true, length: 1 }) // 5 minutes
  async getAssetSupply(token: string): Promise<string> {
    const asset = this.getAsset(token)

    return asset
      ? num(ethers.utils.formatEther(await totalSupply(asset.token))).multipliedBy(1000000).toFixed(0)
      : '0'
  }

  async assetMarketCap(): Promise<string> {
    const assets = this.getAssets()
    let assetMarketCap = num(0)

    await bluebird.map(Object.keys(assets).filter((token) => assets[token]?.symbol !== 'MIR'), async (token) => {
      const { pair } = assets[token]
      const datas = await getPairDayDatas(pair, 0, Date.now(), 1, 'desc')
      if (!datas || datas.length < 1) {
        return
      }
      const pairData = datas[0]
      const price = num(pairData.reserve1).dividedBy(pairData.reserve0)
      const supply = num(ethers.utils.formatEther(await totalSupply(token))).multipliedBy(1000000)

      assetMarketCap = assetMarketCap.plus(supply.multipliedBy(price))
    })

    return assetMarketCap.toFixed(0)
  }
}

export function bscStatisticService(): BscStatisticService {
  return Container.get(BscStatisticService)
}
