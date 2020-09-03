import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import { Key } from '@terra-money/terra.js'
import { ContractEntity } from 'orm'
import { CodeIds, MintContractInfo, MarketContractInfo } from 'types'
import { instantiate, contractInfo } from 'lib/terra'
import * as logger from 'lib/logger'
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
      logger.warn(`can't load any contract. id: ${id}`)
      // throw new Error(`There is no contract ${id}`)
    }

    return this.contract
  }

  async create(codeIds: CodeIds, key: Key): Promise<ContractEntity> {
    const mint = await instantiate(
      codeIds.mint,
      {
        ...config.MINT_INIT_MSG,
        owner: key.accAddress,
      },
      key
    )

    const stakingToken = await instantiate(
      codeIds.stakingToken,
      {
        ...config.STAKING_TOKEN_INIT_MSG,
        initialBalances: [{ address: key.accAddress, amount: '1000000' }],
      },
      key
    )

    const stakingContract = await instantiate(
      codeIds.staking,
      { ...config.STAKING_INIT_MSG, stakingToken },
      key
    )

    const market = await instantiate(
      codeIds.market,
      { ...config.MARKET_INIT_MSG, mint, stakingContract, stakingToken },
      key
    )

    return this.contractRepo.save({
      codeIds,
      mint,
      market,
      stakingToken,
      staking: stakingContract,
      owner: key.accAddress,
      chainId: config.TERRA_CHAIN_ID,
    })
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
