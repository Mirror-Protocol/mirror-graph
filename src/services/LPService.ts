import { Service, Inject } from 'typedi'
import { Key, Coin, Coins } from '@terra-money/terra.js'
import { BlockTxBroadcastResult } from '@terra-money/terra.js/dist/client/lcd/api/TxAPI'
import { Asset, MintWhitelist, MintPosition } from 'orm'
import { AssetService, OwnerService } from 'services'
import { instantiate, contractQuery, execute } from 'lib/terra'
import * as logger from 'lib/logger'
import config from 'config'

@Service()
export class LPService {
  constructor(
    @Inject((type) => OwnerService) private readonly ownerService: OwnerService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {}

  async whitelisting(symbol: string, name: string, ownerKey: Key, oracleKey: Key): Promise<Asset> {
    if (await this.assetService.get(symbol)) {
      throw new Error('already registered symbol asset')
    }

    const contract = this.ownerService.getContract()

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

  async createPool(symbol: string, key: Key): Promise<BlockTxBroadcastResult> {
    const contract = this.ownerService.getContract()

    // execute market.createPool function for pool config
    return execute(
      contract.market,
      { createPool: { symbol, ...config.BASE_MARKET_POOL_CONFIG } },
      key
    )
  }

  // deposit uluna for mint
  async deposit(symbol: string, coin: Coin, key: Key): Promise<BlockTxBroadcastResult> {
    const contract = this.ownerService.getContract()
    return execute(contract.mint, { deposit: { symbol } }, key, new Coins([coin]))
  }

  // mint using uusd
  async mint(symbol: string, coin: Coin, key: Key): Promise<BlockTxBroadcastResult> {
    const contract = this.ownerService.getContract()
    return execute(contract.mint, { mint: { symbol } }, key, new Coins([coin]))
  }

  // provide asset liquidity
  async provideLiquidity(coin: Coin, key: Key): Promise<BlockTxBroadcastResult> {
    const contract = this.ownerService.getContract()
    const marketContractInfo = await this.ownerService.getMarketContractInfo()

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
  async withdrawLiquidity(coin: Coin, key: Key): Promise<BlockTxBroadcastResult> {
    const contract = this.ownerService.getContract()
    const marketContractInfo = await this.ownerService.getMarketContractInfo()

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
    const contract = this.ownerService.getContract()
    return contractQuery(contract.mint, { whitelist: { symbol } })
  }

  async getDeposit(symbol: string, address: string): Promise<{ amount: string }> {
    const contract = this.ownerService.getContract()
    return contractQuery(contract.mint, { deposit: { symbol, address } })
  }

  async getPool(symbol: string): Promise<{ amount: string }> {
    const contract = this.ownerService.getContract()
    return contractQuery(contract.market, { pool: { symbol } })
  }

  async getPosition(symbol: string, address: string): Promise<MintPosition> {
    const contract = this.ownerService.getContract()
    const mintPosition: {
      collateralAmount: string
      assetAmount: string
      isAuctionOpen: boolean
    } = await contractQuery(contract.mint, { position: { symbol, address } })
    const marketPosition: { amount: string } = await contractQuery(contract.market, {
      provider: { symbol, address },
    })
    const { collateralAmount, assetAmount, isAuctionOpen } = mintPosition

    return {
      collateralAmount,
      mintAmount: assetAmount,
      liquidityAmount: marketPosition.amount,
      isAuctionOpen,
    }
  }
}
