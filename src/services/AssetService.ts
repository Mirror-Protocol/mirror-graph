import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions, FindOneOptions } from 'typeorm'
import { Container, Service } from 'typedi'
import { num } from 'lib/num'
import { AssetEntity, AssetPositionEntity } from 'orm'
import config from 'config'

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
    return repo.findOne(conditions, options)
  }

  async getAll(options?: FindOneOptions<AssetEntity>, repo = this.repo): Promise<AssetEntity[]> {
    return repo.find(options)
  }

  async getPosition(
    conditions: FindConditions<AssetPositionEntity>,
    options?: FindOneOptions<AssetPositionEntity>,
    repo = this.positionRepo
  ): Promise<AssetPositionEntity> {
    return repo.findOne(conditions, options)
  }

  async addMintPosition(token: string, amount: string, repo = this.positionRepo): Promise<AssetPositionEntity> {
    const position = await this.getPosition({ token }, undefined, repo)

    position.mint = num(position.mint).plus(amount).toFixed(config.DECIMALS)

    return repo.save(position)
  }

  async addLiquidityPosition(token: string, amount: string, repo = this.positionRepo): Promise<AssetPositionEntity> {
    const position = await this.getPosition({ token }, undefined, repo)

    position.liquidity = num(position.liquidity).plus(amount).toFixed(config.DECIMALS)

    return repo.save(position)
  }

  async addAsCollateralPosition(token: string, amount: string, repo = this.positionRepo): Promise<AssetPositionEntity> {
    const position = await this.getPosition({ token }, undefined, repo)

    position.asCollateral = num(position.asCollateral).plus(amount).toFixed(config.DECIMALS)

    return repo.save(position)
  }
}

export function assetService(): AssetService {
  return Container.get(AssetService)
}
