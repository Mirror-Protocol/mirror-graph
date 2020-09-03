import { Service, Inject } from 'typedi'
import { Key, Coin, Coins, TxInfo } from '@terra-money/terra.js'
import { MintPosition, AmountResponse } from 'types'
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
    const coins: Coins =
      coin.denom === marketContractInfo.initMsg.collateralDenom ? new Coins([coin]) : new Coins([])

    return execute(
      contract.market,
      { provideLiquidity: { coins: [{ denom: coin.denom, amount: coin.amount.toString() }] } },
      key,
      coins
    )
  }

  // withdraw asset liquidity
  async withdrawLiquidity(coin: Coin, key: Key): Promise<TxInfo> {
    const contract = this.contractService.getContract()

    return execute(
      contract.market,
      { withdrawLiquidity: { coins: [{ denom: coin.denom, amount: coin.amount.toString() }] } },
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
