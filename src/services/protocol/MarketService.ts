import { Service, Inject } from 'typedi'
import { Wallet, Coin, Coins, TxInfo } from '@terra-money/terra.js'
import { AssetEntity } from 'orm'
import { MarketContractInfo, MarketPool } from 'types'
import { AssetService } from 'services'
import { contractInfo, contractQuery, execute } from 'lib/terra'

@Service()
export class MarketService {
  constructor(@Inject((type) => AssetService) private readonly assetService: AssetService) {}

  async provideLiquidity(assetCoin: Coin, collateralCoin: Coin, wallet: Wallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol: assetCoin.denom })

    return execute(
      asset.market,
      {
        provideLiquidity: {
          // coins: [{ denom: coin.denom, amount: coin.amount.toString() }]
          coins: [assetCoin.toData(), collateralCoin.toData()],
        },
      },
      wallet,
      new Coins([collateralCoin])
    )
  }

  async withdrawLiquidity(symbol: string, amount: string, wallet: Wallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol })

    return execute(asset.market, { withdrawLiquidity: { amount } }, wallet)
  }

  async getMarketContractInfo(asset: AssetEntity): Promise<MarketContractInfo> {
    return (await contractInfo(asset.market)) as MarketContractInfo
  }

  async getPool(symbol: string): Promise<MarketPool> {
    const asset = await this.assetService.get({ symbol })
    return contractQuery<MarketPool>(asset.market, { pool: {} })
  }
}
