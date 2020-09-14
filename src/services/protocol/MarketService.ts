import { Service, Inject } from 'typedi'
import { Coin, Coins, TxInfo } from '@terra-money/terra.js'
import { contractInfo, TxWallet } from 'lib/terra'
import { AssetEntity } from 'orm'
import { MarketContractInfo, ContractType } from 'types'
import { AssetService, ContractService } from 'services'

@Service()
export class MarketService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => ContractService) private readonly contractService: ContractService
  ) {}

  async provideLiquidity(assetCoin: Coin, collateralCoin: Coin, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol: assetCoin.denom })
    const tokenContract = await this.contractService.get({ asset, type: ContractType.TOKEN })
    const marketContract = await this.contractService.get({ asset, type: ContractType.MARKET })

    // approve token transfer to market contract
    await wallet.execute(tokenContract.address, {
      increaseAllowance: {
        amount: assetCoin.amount.toString(),
        spender: marketContract.address,
      },
    })

    return wallet.execute(
      marketContract.address,
      { provideLiquidity: { coins: [assetCoin.toData(), collateralCoin.toData()] } },
      new Coins([collateralCoin])
    )
  }

  async withdrawLiquidity(symbol: string, amount: string, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol })
    const marketContract = await this.contractService.get({ asset, type: ContractType.MARKET })

    return wallet.execute(marketContract.address, { withdrawLiquidity: { amount } })
  }

  async getMarketContractInfo(asset: AssetEntity): Promise<MarketContractInfo> {
    const marketContract = await this.contractService.get({ asset, type: ContractType.MARKET })

    return contractInfo<MarketContractInfo>(marketContract.address)
  }
}
