import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions } from 'typeorm'
import { Service, Inject } from 'typedi'
import { AssetEntity, GovEntity } from 'orm'
import { GovService } from 'services'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity) private readonly repo: Repository<AssetEntity>,
    @Inject((type) => GovService) private readonly govService: GovService,
  ) {}

  get gov(): GovEntity {
    return this.govService.get()
  }

  async get(conditions: FindConditions<AssetEntity>, repo = this.repo): Promise<AssetEntity> {
    return repo.findOne({
      ...conditions, gov: conditions.gov || this.gov,
    })
  }

  async getAll(repo = this.repo): Promise<AssetEntity[]> {
    return repo.find({ gov: this.gov })
  }

  async search(text?: string, repo = this.repo): Promise<AssetEntity[]> {
    return repo.find({ gov: this.gov })
  }
}
