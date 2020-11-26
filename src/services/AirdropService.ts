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
    repo = this.repo,
  ): Promise<AirdropEntity> {
    return repo.findOne(conditions, options)
  }

  async getAll(options?: FindManyOptions<AirdropEntity>, repo = this.repo): Promise<AirdropEntity[]> {
    return repo.find(options)
  }

  async newAirdrop(airdrop: Partial<AirdropEntity>, repo = this.repo): Promise<AirdropEntity> {
    return repo.save(airdrop)
  }

  async getAirdrop(network: string, address: string, repo = this.repo): Promise<AirdropEntity[]> {
    return this.getAll({
      select: ['address', 'stage', 'proof', 'amount'],
      where: { network, address, claimable: true },
      order: { id: 'ASC' },
    }, repo)
  }
}

export function airdropService(): AirdropService {
  return Container.get(AirdropService)
}
