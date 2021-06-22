import { InjectRepository } from 'typeorm-typedi-extensions'
import {
  Repository,
  FindConditions,
  FindOneOptions,
  FindManyOptions,
  MoreThanOrEqual,
  In
} from 'typeorm'
import { Container, Service } from 'typedi'
import { addMonths } from 'date-fns'
import { getMintAssetConfig, getCollateralAssetInfo } from 'lib/mirror'
import { num } from 'lib/num'
import { govService } from 'services'
import { AssetEntity, AssetPositionsEntity, AssetNewsEntity, PriceEntity } from 'orm'
import { AssetStatus } from 'types'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity) private readonly repo: Repository<AssetEntity>,
    @InjectRepository(AssetPositionsEntity)
    private readonly positionsRepo: Repository<AssetPositionsEntity>,
    @InjectRepository(AssetNewsEntity) private readonly newsRepo: Repository<AssetNewsEntity>,
    @InjectRepository(PriceEntity) private readonly priceRepo: Repository<PriceEntity>
  ) {}

  async get(
    conditions: FindConditions<AssetEntity>,
    options?: FindOneOptions<AssetEntity>,
    repo = this.repo
  ): Promise<AssetEntity> {
    return repo.findOne(conditions, options)
  }

  async getAll(options?: FindManyOptions<AssetEntity>, repo = this.repo): Promise<AssetEntity[]> {
    return repo.find(options)
  }

  async getListedAssets(where?: FindConditions<AssetEntity>): Promise<AssetEntity[]> {
    return this.getAll({ where: { status: In([AssetStatus.LISTED, AssetStatus.PRE_IPO]), ...where }})
  }

  async getCollateralAssets(where?: FindConditions<AssetEntity>): Promise<AssetEntity[]> {
    return this.getAll({ where: { status: AssetStatus.COLLATERAL, ...where }})
  }

  async getPositions(
    conditions: FindConditions<AssetPositionsEntity>,
    options?: FindOneOptions<AssetPositionsEntity>,
    repo = this.positionsRepo
  ): Promise<AssetPositionsEntity> {
    return repo.findOne(conditions, options)
  }

  async getNews(token: string): Promise<AssetNewsEntity[]> {
    return this.newsRepo.find({
      where: { token, datetime: MoreThanOrEqual(addMonths(Date.now(), -1)) },
      order: { datetime: 'DESC' },
      take: 5,
    })
  }

  async getMinCollateralRatio(token: string, collateralToken = 'uusd'): Promise<string> {
    const { mint, collateralOracle, mirrorToken } = govService().get()
    if (token === mirrorToken) {
      return '0'
    }

    const assetConfig = await getMintAssetConfig(mint, token)
    const collateralInfo = collateralToken !== 'uusd' && await getCollateralAssetInfo(collateralOracle, collateralToken)
    const multiplier = collateralInfo?.multiplier || '1'

    return num(assetConfig.minCollateralRatio).multipliedBy(multiplier).toString()
  }

  async addMintPosition(
    token: string,
    amount: string,
    repo = this.positionsRepo
  ): Promise<AssetPositionsEntity> {
    const positions = await this.getPositions({ token }, { select: ['token', 'mint'] }, repo)

    positions.mint = num(positions.mint).plus(amount).toString()

    return repo.save(positions)
  }

  async addLiquidityPosition(
    token: string, lpShares: string, repo = this.positionsRepo
  ): Promise<AssetPositionsEntity> {
    const positions = await this.getPositions(
      { token },
      { select: ['token', 'pool', 'uusdPool', 'lpShares'] },
      repo
    )

    positions.lpShares = num(positions.lpShares).plus(lpShares).toString()

    return repo.save(positions)
  }

  async addStakePosition(
    token: string,
    stakeAmount: string,
    repo = this.positionsRepo
  ): Promise<AssetPositionsEntity> {
    const positions = await this.getPositions({ token }, { select: ['token', 'lpStaked'] }, repo)

    positions.lpStaked = num(positions.lpStaked).plus(stakeAmount).toString()

    return repo.save(positions)
  }
}

export function assetService(): AssetService {
  return Container.get(AssetService)
}
