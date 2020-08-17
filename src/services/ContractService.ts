import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import { Key } from '@terra-money/terra.js'
import { ContractEntity, CodeIds, MintContractInfo, MarketContractInfo } from 'orm'
import { instantiate, contractInfo } from 'lib/terra'
import config from 'config'

@Service()
export class ContractService {
  private contract: ContractEntity

  constructor(
    @InjectRepository(ContractEntity) private readonly contractRepo: Repository<ContractEntity>
  ) {}

  async load(id: number): Promise<ContractEntity> {
    const findOptions = id !== -1 ? { id } : { order: { createdAt: 'DESC' } }
    this.contract = await this.contractRepo.findOne(findOptions)
    if (!this.contract) {
      throw new Error(`There is no contract ${id}`)
    }

    return this.contract
  }

  async create(
    codeIds: CodeIds,
    key: Key,
    mintAddress?: string,
    marketAddress?: string
  ): Promise<ContractEntity> {
    const mint =
      mintAddress ||
      (await instantiate(codeIds.mint, { ...config.BASE_MINT_CONFIG, owner: key.accAddress }, key))

    const market =
      marketAddress ||
      (await instantiate(codeIds.market, { ...config.BASE_MARKET_CONFIG, mint }, key))

    return this.contractRepo.save({ codeIds, mint, market, owner: key.accAddress })
  }

  getContract(): ContractEntity {
    return this.contract
  }

  async getMintContractInfo(): Promise<MintContractInfo> {
    return (await contractInfo(this.contract.mint)) as MintContractInfo
  }

  async getMarketContractInfo(): Promise<MarketContractInfo> {
    return (await contractInfo(this.contract.market)) as MarketContractInfo
  }
}
