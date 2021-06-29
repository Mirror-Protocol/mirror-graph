import memoize from 'memoizee-decorator'
import { Container, Service } from 'typedi'
import { ethers } from 'ethers'
import { getPairHourDatas, getPairDayDatas, totalSupply, EthPairStatisticData } from 'lib/eth'
import { num } from 'lib/num'
import { ethService } from 'services'
import { Network, EthAssets, EthAssetInfos } from 'types'
import { EthBaseStatistic } from './EthBaseStatistic'

@Service()
export class EthStatisticService extends EthBaseStatistic {
  constructor() {
    super()

    this.network = Network.ETH
    this.tradingFeeRate = 0.003
  }

  getAssets(): EthAssets {
    return ethService().getAssets()
  }

  async getAssetInfos(): Promise<EthAssetInfos> {
    return ethService().getAssetInfos()
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

  @memoize({ promise: true, maxAge: 60000 * 5, length: 1, preFetch: true }) // 5 minutes
  async getAssetSupply(token: string): Promise<string> {
    const asset = this.getAsset(token)

    return asset
      ? num(ethers.utils.formatEther(await totalSupply(asset.token))).multipliedBy(1000000).toFixed(0)
      : '0'
  }
}

export function ethStatisticService(): EthStatisticService {
  return Container.get(EthStatisticService)
}
