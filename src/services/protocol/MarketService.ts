import { Service, Inject } from 'typedi'
import { Coin, Coins, TxInfo } from '@terra-money/terra.js'
import { contractInfo, TxWallet } from 'lib/terra'
import { AssetEntity } from 'orm'
import { MarketContractInfo, ContractType } from 'types'
import { AssetService } from 'services'

@Service()
export class MarketService {
  constructor(@Inject((type) => AssetService) private readonly assetService: AssetService) {}

  async provideLiquidity(assetCoin: Coin, collateralCoin: Coin, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol: assetCoin.denom })

    // approve token transfer to market contract
    await wallet.execute(asset.getContract(ContractType.TOKEN).address, {
      increaseAllowance: {
        amount: assetCoin.amount.toString(),
        spender: asset.getContract(ContractType.MARKET).address,
      },
    })

    return wallet.execute(
      asset.getContract(ContractType.MARKET).address,
      { provideLiquidity: { coins: [assetCoin.toData(), collateralCoin.toData()] } },
      new Coins([collateralCoin])
    )
  }

  async withdrawLiquidity(symbol: string, amount: string, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol })

    return wallet.execute(asset.getContract(ContractType.MARKET).address, {
      withdrawLiquidity: { amount },
    })
  }

  async getMarketContractInfo(asset: AssetEntity): Promise<MarketContractInfo> {
    return contractInfo<MarketContractInfo>(asset.getContract(ContractType.MARKET).address)
  }
}
