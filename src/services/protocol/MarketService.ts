import { Service, Inject } from 'typedi'
import { Coin, Coins, TxInfo } from '@terra-money/terra.js'
import { AssetEntity } from 'orm'
import { MarketContractInfo } from 'types'
import { AssetService } from 'services'
import { contractInfo, TxWallet } from 'lib/terra'

@Service()
export class MarketService {
  constructor(@Inject((type) => AssetService) private readonly assetService: AssetService) {}

  async provideLiquidity(assetCoin: Coin, collateralCoin: Coin, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol: assetCoin.denom })

    // approve token transfer to market contract
    await wallet.execute(asset.token, {
      increaseAllowance: { amount: assetCoin.amount.toString(), spender: asset.market },
    })

    return wallet.execute(
      asset.market,
      { provideLiquidity: { coins: [assetCoin.toData(), collateralCoin.toData()] } },
      new Coins([collateralCoin])
    )
  }

  async withdrawLiquidity(symbol: string, amount: string, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol })

    return wallet.execute(asset.market, { withdrawLiquidity: { amount } })
  }

  async getMarketContractInfo(asset: AssetEntity): Promise<MarketContractInfo> {
    return contractInfo<MarketContractInfo>(asset.market)
  }
}
