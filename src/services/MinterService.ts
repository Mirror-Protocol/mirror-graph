import { Service, Inject } from 'typedi'
import { Key, Coins } from '@terra-money/terra.js'
import { Asset, MintConfig, Whitelist } from 'orm'
import { OwnerService, AssetService } from 'services'
import { instantiate, contractQuery, contractInfo, execute } from 'lib/terra'
import * as logger from 'lib/logger'
import { toCamelCase } from 'lib/caseStyles'

@Service()
export class MinterService {
  constructor(
    @Inject((type) => OwnerService) private readonly ownerService: OwnerService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {}

  async config(
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
  ): Promise<void> {
    const contract = await this.ownerService.getContract()

    await execute(contract.mint, { updateConfig: options }, key)
  }

  async whitelisting(symbol: string, name: string, key: Key): Promise<Asset> {
    if (await this.assetService.get(symbol)) {
      throw new Error('already registered symbol asset')
    }

    const contract = await this.ownerService.getContract()

    const token = await instantiate(
      contract.codeIds.token,
      {
        minter: contract.mint,
        symbol,
        name,
        decimals: 6,
        initialBalances: [],
      },
      key
    )

    const oracle = await instantiate(
      contract.codeIds.oracle,
      {
        assetToken: token,
        baseDenom: symbol,
        quoteDenom: 'uusd',
      },
      key
    )

    logger.info('oracle', await contractInfo(oracle))
    logger.info('token', await contractInfo(token))

    // execute whitelist function in mint contact
    await execute(contract.mint, { whitelist: { assetToken: token, oracle, symbol } }, key)

    // save asset entity to database
    const asset = await this.assetService.create({ symbol, name, token, oracle, contract })

    logger.info(`whitelisted asset ${symbol}`)

    return asset
  }

  async deposit(symbol: string, key: Key, amount: string): Promise<void> {
    const contract = await this.ownerService.getContract()

    // execute deposit function in mint contact
    await execute(contract.mint, { deposit: { symbol } }, key, new Coins(amount))
  }

  async mint(symbol: string, key: Key, amount: string): Promise<void> {
    const contract = await this.ownerService.getContract()

    // execute mint function in mint contact
    await execute(contract.mint, { mint: { symbol } }, key, new Coins(amount))
  }

  async getConfig(): Promise<MintConfig> {
    const contract = await this.ownerService.getContract()
    return toCamelCase(await contractQuery(contract.mint, { config: {} }))
  }

  async getWhitelist(symbol: string): Promise<Whitelist> {
    const contract = await this.ownerService.getContract()
    return toCamelCase(await contractQuery(contract.mint, { whitelist: { symbol } }))
  }

  async getDeposit(symbol: string, address: string): Promise<{ amount: string }> {
    const contract = await this.ownerService.getContract()
    return contractQuery(contract.mint, { deposit: { symbol, address } })
  }

  async getPosition(symbol: string, address: string): Promise<{ amount: string }> {
    const contract = await this.ownerService.getContract()
    return contractQuery(contract.mint, { position: { symbol, address } })
  }
}
