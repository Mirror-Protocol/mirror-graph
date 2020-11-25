import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions, FindOneOptions, FindManyOptions } from 'typeorm'
import { Container, Service } from 'typedi'
import { AirdropEntity } from 'orm'

@Service()
export class AirdropService {
  constructor(@InjectRepository(AirdropEntity) private readonly repo: Repository<AirdropEntity>) {}

  async get(
    conditions: FindConditions<AirdropEntity>,
    options?: FindOneOptions<AirdropEntity>,
  ): Promise<AirdropEntity> {
    return this.repo.findOne(conditions, options)
  }

  async getAll(options?: FindManyOptions<AirdropEntity>): Promise<AirdropEntity[]> {
    return this.repo.find(options)
  }

  async newAirdrop(airdrop: Partial<AirdropEntity>): Promise<AirdropEntity> {
    return this.repo.save(airdrop)
  }
}

export function airdropService(): AirdropService {
  return Container.get(AirdropService)
}
