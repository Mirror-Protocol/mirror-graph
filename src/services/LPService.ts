import { Service, Inject } from 'typedi'
import { Key, Coins, Coin } from '@terra-money/terra.js'
import { Contract } from 'orm'
import { OwnerService } from 'services'
import { execute } from 'lib/terra'

@Service()
export class LPService {
  private contract: Contract

  constructor(@Inject((type) => OwnerService) private readonly ownerService: OwnerService) {
    this.contract = this.ownerService.getContract()
  }

  // provide uusd liquidity
  async provideCollateral(coinString: string, key: Key): Promise<void> {
    return execute(this.contract.market, { provideCollateral: {} }, key, new Coins(coinString))
  }

  // withdraw uusd liquidity
  async withdrawCollateral(coinString: string, key: Key): Promise<void> {
    const coin = Coin.fromString(coinString)
    const marketContractInfo = await this.ownerService.getMarketContractInfo()
    if (coin.denom !== marketContractInfo.initMsg.collateralDenom) {
      throw new Error(`coin must be ${marketContractInfo.initMsg.collateralDenom}`)
    }

    return execute(this.contract.market, { withdrawCollateral: { amount: coin.amount } }, key)
  }

  // provide asset liquidity
  async provideLiquidity(symbol: string, amount: string, key: Key): Promise<void> {
    return execute(this.contract.market, { provideLiquidity: { symbol, amount } }, key)
  }

  // withdraw asset liquidity
  async withdrawLiquidity(symbol: string, amount: string, key: Key): Promise<void> {
    return execute(this.contract.market, { withdrawLiquidity: { symbol, amount } }, key)
  }
}
