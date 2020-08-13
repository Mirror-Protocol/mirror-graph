import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import { Key, TxInfo } from '@terra-money/terra.js'
import {
  Contract,
  CodeIds,
  MintContractInfo,
  MintConfig,
  MarketContractInfo,
  MarketConfig,
  MarketPoolConfig,
} from 'orm'
import { instantiate, contractQuery, contractInfo, execute } from 'lib/terra'
import config from 'config'

@Service()
export class OwnerService {
  private contract: Contract

  constructor(@InjectRepository(Contract) private readonly contractRepo: Repository<Contract>) {}

  async load(id: number): Promise<Contract> {
    const findOptions = id !== -1 ? { id } : { order: { createdAt: 'DESC' } }
    this.contract = await this.contractRepo.findOne(findOptions)
    if (!this.contract) {
      throw new Error(`There is no contract ${id}`)
    }

    return this.contract
  }

  getContract(): Contract {
    return this.contract
  }

  async create(
    codeIds: CodeIds,
    key: Key,
    mintAddress?: string,
    marketAddress?: string
  ): Promise<Contract> {
    const mint =
      mintAddress ||
      (await instantiate(codeIds.mint, { ...config.BASE_MINT_CONFIG, owner: key.accAddress }, key))

    const market =
      marketAddress ||
      (await instantiate(codeIds.market, { ...config.BASE_MARKET_CONFIG, mint }, key))

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
  ): Promise<TxInfo> {
    return execute(this.contract.mint, { updateConfig: options }, key)
  }

  async configMarket(owner: string, key: Key): Promise<TxInfo> {
    return execute(this.contract.market, { updateConfig: owner }, key)
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
    return execute(this.contract.market, { updatePoolConfig: options }, key)
  }

  async getMintConfig(): Promise<MintConfig> {
    return contractQuery(this.contract.mint, { config: {} })
  }

  async getMarketConfig(): Promise<MarketConfig> {
    return contractQuery(this.contract.market, { config: {} })
  }

  async getMarketPoolConfig(symbol: string): Promise<MarketPoolConfig> {
    return contractQuery(this.contract.market, { poolConfig: { symbol } })
  }

  async getMintContractInfo(): Promise<MintContractInfo> {
    return (await contractInfo(this.contract.mint)) as MintContractInfo
  }

  async getMarketContractInfo(): Promise<MarketContractInfo> {
    return (await contractInfo(this.contract.market)) as MarketContractInfo
  }
}
