import { Repository, FindConditions, FindOneOptions, FindManyOptions } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service } from 'typedi'
import { TxEntity } from 'orm'

@Service()
export class TxService {
  constructor(
    @InjectRepository(TxEntity) private readonly repo: Repository<TxEntity>,
  ) {}

  async get(
    conditions: FindConditions<TxEntity>, options?: FindOneOptions<TxEntity>, repo = this.repo
  ): Promise<TxEntity> {
    return repo.findOne(conditions, options)
  }

  async getAll(options?: FindManyOptions<TxEntity>, repo = this.repo): Promise<TxEntity[]> {
    return repo.find(options)
  }
}

export function txService(): TxService {
  return Container.get(TxService)
}
