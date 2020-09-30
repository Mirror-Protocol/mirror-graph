import { Repository, FindConditions, FindOneOptions, FindManyOptions } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import { ContractEntity } from 'orm'

@Service()
export class ContractService {
  constructor(
    @InjectRepository(ContractEntity) private readonly contractRepo: Repository<ContractEntity>
  ) {}

  async get(conditions: FindConditions<ContractEntity>, options?: FindOneOptions<ContractEntity>): Promise<ContractEntity> {
    if (!conditions.gov && !conditions.asset && !conditions.address) {
      throw new Error('conditions must have gov or asset')
    }
    return this.contractRepo.findOne(conditions, options)
  }

  async find(options?: FindManyOptions<ContractEntity>): Promise<ContractEntity[]> {
    return this.contractRepo.find(options)
  }
}
