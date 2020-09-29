import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions } from 'typeorm'
import { Service, Inject } from 'typedi'
import { AssetEntity, GovEntity } from 'orm'
import { GovService } from 'services'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity) private readonly assetRepo: Repository<AssetEntity>,
    @Inject((type) => GovService) private readonly govService: GovService,
  ) {}

  get gov(): GovEntity {
    return this.govService.get()
  }

  async get(conditions: FindConditions<AssetEntity>): Promise<AssetEntity> {
    return this.assetRepo.findOne({
      ...conditions, gov: conditions.gov || this.gov,
    })
  }

  async getAll(): Promise<AssetEntity[]> {
    return this.assetRepo.find({ gov: this.gov })
  }

  async search(text?: string): Promise<AssetEntity[]> {
    return this.assetRepo.find({ gov: this.gov })
  }
}
