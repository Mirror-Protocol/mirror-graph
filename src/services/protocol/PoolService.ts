import { Service, Inject } from 'typedi'
import { Coin, Coins, TxInfo, MsgExecuteContract } from '@terra-money/terra.js'
import { contractInfo, contractQuery, TxWallet } from 'lib/terra'
import { toSnakeCase } from 'lib/caseStyles'
import { AssetEntity } from 'orm'
import { MarketContractInfo, ContractType, MarketPool } from 'types'
import { AssetService, ContractService } from 'services'

@Service()
export class PoolService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => ContractService) private readonly contractService: ContractService
  ) {}

  async provideLiquidity(assetCoin: Coin, collateralCoin: Coin, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol: assetCoin.denom })
    const marketContract = await this.contractService.get({ asset, type: ContractType.MARKET })
    const tokenContract = await this.contractService.get({ asset, type: ContractType.TOKEN })

    const allowMsg = toSnakeCase({ increaseAllowance: {
      amount: assetCoin.amount.toString(), spender: marketContract.address,
    } })
    const provideMsg = toSnakeCase({
      provideLiquidity: { coins: [assetCoin.toData(), collateralCoin.toData()] }
    })

    return wallet.executeMsgs([
      new MsgExecuteContract(
        wallet.key.accAddress, tokenContract.address, allowMsg, new Coins([])
      ),
      new MsgExecuteContract(
        wallet.key.accAddress, marketContract.address, provideMsg, new Coins([collateralCoin])
      ),
    ])
  }

  async withdrawLiquidity(symbol: string, amount: string, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol })
    const marketContract = await this.contractService.get({ asset, type: ContractType.MARKET })
    const lpTokenContract = await this.contractService.get({ asset, type: ContractType.LP_TOKEN })

    const allowMsg = toSnakeCase(
      { increaseAllowance: { amount, spender: marketContract.address } }
    )
    const withdrawMsg = toSnakeCase({ withdrawLiquidity: { amount } })

    return wallet.executeMsgs([
      new MsgExecuteContract(
        wallet.key.accAddress, lpTokenContract.address, allowMsg, new Coins([])
      ),
      new MsgExecuteContract(
        wallet.key.accAddress, marketContract.address, withdrawMsg, new Coins([])
      ),
    ])
  }

  async getPool(asset: AssetEntity): Promise<MarketPool> {
    const marketContract = await this.contractService.get({ asset, type: ContractType.MARKET })
    if (!marketContract) {
      return undefined
    }
    return contractQuery<MarketPool>(marketContract.address, { pool: {} })
  }

  async getMarketContractInfo(asset: AssetEntity): Promise<MarketContractInfo> {
    const marketContract = await this.contractService.get({ asset, type: ContractType.MARKET })

    return contractInfo<MarketContractInfo>(marketContract.address)
  }
}
