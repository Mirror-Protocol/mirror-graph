import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions, FindOneOptions, FindManyOptions } from 'typeorm'
import { Container, Service } from 'typedi'
import { LimitOrderEntity } from 'orm'

@Service()
export class LimitOrderService {
  constructor(@InjectRepository(LimitOrderEntity) private readonly repo: Repository<LimitOrderEntity>) {}

  async get(
    conditions: FindConditions<LimitOrderEntity>,
    options?: FindOneOptions<LimitOrderEntity>,
    repo = this.repo
  ): Promise<LimitOrderEntity> {
    return repo.findOne(conditions, options)
  }

  async getAll(options?: FindManyOptions<LimitOrderEntity>, repo = this.repo): Promise<LimitOrderEntity[]> {
    return repo.find(options)
  }
}

export function limitOrderService(): LimitOrderService {
  return Container.get(LimitOrderService)
}
