import { Service, Inject } from 'typedi'
import { Key, Coin, Coins, TxInfo } from '@terra-money/terra.js'
import { MintPosition, AmountResponse } from 'orm'
import { AssetService, ContractService } from 'services'
import { contractQuery, execute } from 'lib/terra'

@Service()
export class LPService {
  constructor(
    @Inject((type) => ContractService) private readonly contractService: ContractService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {}

  // mint using uusd
  async mint(symbol: string, coin: Coin, key: Key): Promise<TxInfo> {
    const contract = this.contractService.getContract()
    return execute(contract.mint, { mint: { symbol } }, key, new Coins([coin]))
  }

  // provide asset liquidity
  async provideLiquidity(coin: Coin, key: Key): Promise<TxInfo> {
    const contract = this.contractService.getContract()
    const marketContractInfo = await this.contractService.getMarketContractInfo()

    // if collateral denom, execute provideCollateral
    if (coin.denom === marketContractInfo.initMsg.collateralDenom) {
      return execute(contract.market, { provideCollateral: {} }, key, new Coins([coin]))
    }

    return execute(
      contract.market,
      { provideLiquidity: { symbol: coin.denom, amount: coin.amount.toString() } },
      key
    )
  }

  // withdraw asset liquidity
  async withdrawLiquidity(coin: Coin, key: Key): Promise<TxInfo> {
    const contract = this.contractService.getContract()
    const marketContractInfo = await this.contractService.getMarketContractInfo()

    // if collateral denom, execute withdrawCollateral
    if (coin.denom === marketContractInfo.initMsg.collateralDenom) {
      return execute(
        contract.market,
        { withdrawCollateral: { amount: coin.amount.toString() } },
        key
      )
    }

    return execute(
      contract.market,
      { withdrawLiquidity: { symbol: coin.denom, amount: coin.amount.toString() } },
      key
    )
  }

  async getLiquidityAmount(symbol: string, address: string): Promise<string> {
    const contract = this.contractService.getContract()
    const { amount } = await contractQuery<AmountResponse>(contract.market, {
      provider: { symbol, address },
    })
    return amount
  }

  async getMintPosition(symbol: string, address: string): Promise<MintPosition> {
    const contract = this.contractService.getContract()
    return contractQuery<MintPosition>(contract.mint, { position: { symbol, address } })
  }
}
