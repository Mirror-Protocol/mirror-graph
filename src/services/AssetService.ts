import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions, FindOneOptions } from 'typeorm'
import { Container, Service } from 'typedi'
import { num } from 'lib/num'
import { AssetEntity, AssetPositionsEntity } from 'orm'
import config from 'config'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity) private readonly repo: Repository<AssetEntity>,
    @InjectRepository(AssetPositionsEntity) private readonly positionsRepo: Repository<AssetPositionsEntity>,
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

  async getPositions(
    conditions: FindConditions<AssetPositionsEntity>,
    options?: FindOneOptions<AssetPositionsEntity>,
    repo = this.positionsRepo
  ): Promise<AssetPositionsEntity> {
    return repo.findOne(conditions, options)
  }

  async addMintPosition(token: string, amount: string, repo = this.positionsRepo): Promise<AssetPositionsEntity> {
    const positions = await this.getPositions({ token }, undefined, repo)

    positions.mint = num(positions.mint).plus(amount).toFixed(config.DECIMALS)

    return repo.save(positions)
  }

  async addLiquidityPosition(token: string, amount: string, repo = this.positionsRepo): Promise<AssetPositionsEntity> {
    const positions = await this.getPositions({ token }, undefined, repo)

    positions.liquidity = num(positions.liquidity).plus(amount).toFixed(config.DECIMALS)

    return repo.save(positions)
  }

  async addAsCollateralPosition(token: string, amount: string, repo = this.positionsRepo): Promise<AssetPositionsEntity> {
    const positions = await this.getPositions({ token }, undefined, repo)

    positions.asCollateral = num(positions.asCollateral).plus(amount).toFixed(config.DECIMALS)

    return repo.save(positions)
  }
}

export function assetService(): AssetService {
  return Container.get(AssetService)
}
