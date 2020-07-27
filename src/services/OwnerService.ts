import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import {
  Contract,
  CodeIds,
  MintContractInfo,
  MintConfig,
  MarketContractInfo,
  MarketConfig,
  MarketPoolConfig,
} from 'orm'
import { Key } from '@terra-money/terra.js'
import { instantiate, contractQuery, contractInfo, execute } from 'lib/terra'
import config from 'config'

@Service()
export class OwnerService {
  private contract: Contract

  constructor(@InjectRepository(Contract) private readonly contractRepo: Repository<Contract>) {}

  async load(id?: number): Promise<Contract> {
    const findOptions = id ? { id } : { order: { createdAt: 'DESC' } }

    this.contract = await this.contractRepo.findOne(findOptions)
    if (!this.contract) {
      throw new Error(`There is no contract ${id}`)
    }

    return this.contract
  }

  async getContract(): Promise<Contract> {
    return this.contract || this.load()
  }

  async create(codeIds: CodeIds, key: Key): Promise<Contract> {
    const mint = await instantiate(
      codeIds.mint,
      {
        ...config.BASE_MINT_CONFIG,
        owner: key.accAddress,
      },
      key
    )

    const market = await instantiate(
      codeIds.market,
      {
        ...config.BASE_MARKET_CONFIG,
        mint,
      },
      key
    )

    return this.contractRepo.save({ codeIds, mint, market, owner: key.accAddress })
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
  ): Promise<void> {
    const contract = await this.getContract()

    return execute(contract.mint, { updateConfig: options }, key)
  }

  async configMarket(owner: string, key: Key): Promise<void> {
    const contract = await this.getContract()

    return execute(contract.market, { updateConfig: owner }, key)
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
  ): Promise<void> {
    const contract = await this.getContract()

    return execute(contract.market, { updatePoolConfig: options }, key)
  }

  async getMintConfig(): Promise<MintConfig> {
    const contract = await this.getContract()
    return contractQuery(contract.mint, { config: {} })
  }

  async getMarketConfig(): Promise<MarketConfig> {
    const contract = await this.getContract()
    return contractQuery(contract.market, { config: {} })
  }

  async getMarketPoolConfig(symbol: string): Promise<MarketPoolConfig> {
    const contract = await this.getContract()
    return contractQuery(contract.market, { poolConfig: { symbol } })
  }

  async mintContractInfo(): Promise<MintContractInfo> {
    const contract = await this.getContract()

    return (await contractInfo(contract.mint)) as MintContractInfo
  }

  async marketContractInfo(): Promise<MarketContractInfo> {
    const contract = await this.getContract()

    return (await contractInfo(contract.market)) as MarketContractInfo
  }
}
