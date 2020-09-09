import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import { Key } from '@terra-money/terra.js'
import { ContractEntity } from 'orm'
import { CodeIds } from 'types'
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
    return this.contractRepo.save({
      codeIds,
      factory: '',
      collector: '',
      gov: '',
      owner: key.accAddress,
      chainId: config.TERRA_CHAIN_ID,
    })
  }

  async set(option: Partial<ContractEntity>): Promise<ContractEntity> {
    this.contract = Object.assign(this.contract, option)
    return this.contractRepo.save(this.contract)
  }

  getContract(): ContractEntity {
    return this.contract
  }
}
