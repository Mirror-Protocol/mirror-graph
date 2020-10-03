import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions, FindOneOptions } from 'typeorm'
import { Container, Service } from 'typedi'
import { AssetEntity, AssetPositionEntity } from 'orm'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity) private readonly repo: Repository<AssetEntity>,
    @InjectRepository(AssetPositionEntity) private readonly positionRepo: Repository<AssetPositionEntity>,
  ) {}

  async get(
    conditions: FindConditions<AssetEntity>,
    options?: FindOneOptions<AssetEntity>,
    repo = this.repo
  ): Promise<AssetEntity> {
    return repo.findOne(conditions)
  }

  async getAll(options?: FindOneOptions<AssetEntity>, repo = this.repo): Promise<AssetEntity[]> {
    return repo.find()
  }

  async getPosition(conditions: FindConditions<AssetPositionEntity>, repo = this.positionRepo): Promise<AssetPositionEntity> {
    return repo.findOne(conditions)
  }
}

export function assetService(): AssetService {
  return Container.get(AssetService)
}
