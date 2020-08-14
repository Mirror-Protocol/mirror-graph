import { Service, Inject } from 'typedi'
import { Key, Coin, Coins, TxInfo } from '@terra-money/terra.js'
import { Asset, MintWhitelist, MintPosition, AssetPool } from 'orm'
import { AssetService, ContractService } from 'services'
import { instantiate, contractQuery, execute } from 'lib/terra'
import * as logger from 'lib/logger'
import { num } from 'lib/num'
import config from 'config'

interface AmountResponse {
  amount: string
}

@Service()
export class LPService {
  constructor(
    @Inject((type) => ContractService) private readonly contractService: ContractService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {}

  async whitelisting(symbol: string, name: string, ownerKey: Key, oracleKey: Key): Promise<Asset> {
    if (await this.assetService.get(symbol)) {
      throw new Error('already registered symbol asset')
    }

    const contract = this.contractService.getContract()

    const token = await instantiate(
      contract.codeIds.token,
      { minter: contract.mint, symbol, name, decimals: 6, initialBalances: [] },
      ownerKey
    )

    const oracle = await instantiate(
      contract.codeIds.oracle,
      { assetToken: token, baseDenom: symbol, quoteDenom: 'uusd' },
      oracleKey
    )

    // execute mint.whitelist function for whitelist
    await execute(contract.mint, { whitelist: { assetToken: token, oracle, symbol } }, ownerKey)

    // save asset entity to database
    const asset = await this.assetService.create({ symbol, name, token, oracle, contract })

    logger.info(`whitelisted asset ${symbol}`)

    return asset
  }

  async createPool(symbol: string, key: Key): Promise<TxInfo> {
    const contract = this.contractService.getContract()

    // execute market.createPool function for pool config
    return execute(
      contract.market,
      { createPool: { symbol, ...config.BASE_MARKET_POOL_CONFIG } },
      key
    )
  }

  // deposit uluna for mint
  async deposit(symbol: string, coin: Coin, key: Key): Promise<TxInfo> {
    const contract = this.contractService.getContract()
    return execute(contract.mint, { deposit: { symbol } }, key, new Coins([coin]))
  }

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

  async getWhitelist(symbol: string): Promise<MintWhitelist> {
    const contract = this.contractService.getContract()
    return contractQuery(contract.mint, { whitelist: { symbol } })
  }

  async getDepositAmount(symbol: string, address: string): Promise<string> {
    const contract = this.contractService.getContract()
    const { amount } = await contractQuery<AmountResponse>(contract.mint, {
      deposit: { symbol, address },
    })
    return amount
  }

  async getPoolAmount(symbol: string): Promise<AssetPool> {
    const contract = this.contractService.getContract()
    const { basePool } = await this.contractService.getMarketPoolConfig(symbol)
    const assetPool = await contractQuery<AssetPool>(contract.market, { pool: { symbol } })

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
    const contract = this.contractService.getContract()
    const { collectedRewards } = await contractQuery<{ collectedRewards: string }>(
      contract.market,
      { collateral: {} }
    )
    return collectedRewards
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
