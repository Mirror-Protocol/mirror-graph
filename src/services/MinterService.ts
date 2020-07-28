import { Service, Inject } from 'typedi'
import { Key, Coins } from '@terra-money/terra.js'
import { Contract, Asset, MintWhitelist } from 'orm'
import { OwnerService, AssetService } from 'services'
import { instantiate, contractQuery, contractInfo, execute } from 'lib/terra'
import * as logger from 'lib/logger'
import config from 'config'

@Service()
export class MinterService {
  private contract: Contract

  constructor(
    @Inject((type) => OwnerService) private readonly ownerService: OwnerService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {
    this.contract = this.ownerService.getContract()
  }

  async whitelisting(symbol: string, name: string, ownerKey: Key, oracleKey: Key): Promise<Asset> {
    if (await this.assetService.get(symbol)) {
      throw new Error('already registered symbol asset')
    }

    const { contract } = this

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

    logger.info('oracle', await contractInfo(oracle))
    logger.info('token', await contractInfo(token))

    // execute mint.whitelist function for whitelist
    await execute(contract.mint, { whitelist: { assetToken: token, oracle, symbol } }, ownerKey)

    // execute market.createPool function for pool config
    await execute(
      contract.market,
      { createPool: { symbol, ...config.BASE_MARKET_POOL_CONFIG } },
      ownerKey
    )

    // save asset entity to database
    const asset = await this.assetService.create({ symbol, name, token, oracle, contract })

    logger.info(`whitelisted asset ${symbol}`)

    return asset
  }

  // deposit uluna for mint
  async deposit(symbol: string, key: Key, amount: string): Promise<void> {
    return execute(this.contract.mint, { deposit: { symbol } }, key, new Coins(amount))
  }

  // mint using uusd
  async mint(symbol: string, key: Key, amount: string): Promise<void> {
    return execute(this.contract.mint, { mint: { symbol } }, key, new Coins(amount))
  }

  async getWhitelist(symbol: string): Promise<MintWhitelist> {
    return contractQuery(this.contract.mint, { whitelist: { symbol } })
  }

  async getDeposit(symbol: string, address: string): Promise<{ amount: string }> {
    return contractQuery(this.contract.mint, { deposit: { symbol, address } })
  }

  async getPosition(symbol: string, address: string): Promise<{ amount: string }> {
    return contractQuery(this.contract.mint, { position: { symbol, address } })
  }
}
