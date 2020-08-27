import { Service, Inject } from 'typedi'
import { Key, TxInfo } from '@terra-money/terra.js'
import { AssetPool, MintConfig, MarketConfig, MarketPoolConfig } from 'orm'
import { AssetService, ContractService } from 'services'
import { contractQuery, execute } from 'lib/terra'
import { num } from 'lib/num'
import config from 'config'

@Service()
export class OwnerService {
  constructor(
    @Inject((type) => ContractService) private readonly contractService: ContractService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {}

  async createPool(symbol: string, key: Key): Promise<TxInfo> {
    // execute market.createPool function for pool config
    return execute(
      this.contractService.getContract().market,
      { createPool: { symbol, ...config.CREATE_MARKET_POOL_CONFIG } },
      key
    )
  }

  async configMint(
    options: {
      collateralDenom?: string
      depositDenom?: string
      whitelistThreshold?: string
      auctionDiscount?: string
      auctionThresholdRate?: string
      mintCapacity?: string
      owner?: string
    },
    key: Key
  ): Promise<TxInfo> {
    return execute(this.contractService.getContract().mint, { updateConfig: options }, key)
  }

  async configMarket(owner: string, key: Key): Promise<TxInfo> {
    return execute(this.contractService.getContract().market, { updateConfig: owner }, key)
  }

  async configMarketPool(
    options: {
      symbol: string
      basePool?: string
      commissionRate?: string
      minSpread?: string
      maxSpread?: string
      marginThresholdRate?: string
      marginDiscountRate?: string
    },
    key: Key
  ): Promise<TxInfo> {
    return execute(this.contractService.getContract().market, { updatePoolConfig: options }, key)
  }

  async getMintConfig(): Promise<MintConfig> {
    return contractQuery(this.contractService.getContract().mint, { config: {} })
  }

  async getMarketConfig(): Promise<MarketConfig> {
    return contractQuery(this.contractService.getContract().market, { config: {} })
  }

  async getMarketPoolConfig(symbol: string): Promise<MarketPoolConfig> {
    return contractQuery(this.contractService.getContract().market, { poolConfig: { symbol } })
  }

  async getPoolAmount(symbol: string): Promise<AssetPool> {
    const contract = this.contractService.getContract()
    const asset = await this.assetService.get({ symbol })
    const { basePool } = await this.getMarketPoolConfig(symbol)
    const assetPool = await contractQuery<AssetPool>(contract.market, { pool: { symbol } })

    const assetBalance = await contractQuery<{ balance: string }>(asset.token, {
      balance: { address: contract.market },
    })
    assetPool.marketBalance = assetBalance.balance

    // const { collateralDenom } = (await this.contractService.getMarketContractInfo()).initMsg
    // const collateralCoin = (await lcd.bank.balance(contract.market)).get(collateralDenom)
    // console.log(collateralCoin)

    // asset pool = base pool + delta
    const delta = assetPool.deltaSign ? `-${assetPool.delta}` : assetPool.delta
    assetPool.poolAmount = num(basePool).plus(delta).toString()

    // collateral pool = base pool^2 / asset pool
    assetPool.collateralPoolAmount = num(basePool)
      .times(basePool)
      .dividedBy(assetPool.poolAmount)
      .toString()

    return assetPool
  }

  async getCollateralRewards(): Promise<string> {
    const { collectedRewards } = await contractQuery<{ collectedRewards: string }>(
      this.contractService.getContract().market,
      { collateral: {} }
    )
    return collectedRewards
  }
}
