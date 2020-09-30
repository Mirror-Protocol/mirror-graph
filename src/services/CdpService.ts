import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions } from 'typeorm'
import { Service } from 'typedi'
import { CdpEntity } from 'orm'

@Service()
export class CdpService {
  constructor(
    @InjectRepository(CdpEntity) private readonly repo: Repository<CdpEntity>,
  ) {}

  async get(conditions: FindConditions<CdpEntity>, repo = this.repo): Promise<CdpEntity> {
    return repo.findOne(conditions)
  }

  async getAll(repo = this.repo): Promise<CdpEntity[]> {
    return repo.find()
  }
}
