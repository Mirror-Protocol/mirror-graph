import { InjectRepository } from 'typeorm-typedi-extensions'
import {
  Repository,
  FindConditions,
  FindOneOptions,
  FindManyOptions,
  MoreThanOrEqual,
} from 'typeorm'
import { Container, Service } from 'typedi'
import { addMonths } from 'date-fns'
import { num, BigNumber } from 'lib/num'
import { AssetEntity, AssetPositionsEntity, AssetNewsEntity, PriceEntity } from 'orm'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity) private readonly repo: Repository<AssetEntity>,
    @InjectRepository(AssetPositionsEntity)
    private readonly positionsRepo: Repository<AssetPositionsEntity>,
    @InjectRepository(AssetNewsEntity) private readonly newsRepo: Repository<AssetNewsEntity>,
    @InjectRepository(PriceEntity) private readonly priceRepo: Repository<PriceEntity>,
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
    token: string,
    tokenValue: string,
    uusdValue: string,
    lpShares: string,
    datetime: Date,
    repo = this.positionsRepo
  ): Promise<AssetPositionsEntity> {
    const positions = await this.getPositions(
      { token },
      { select: ['token', 'liquidity', 'uusdLiquidity', 'pool', 'uusdPool', 'lpShares'] },
      repo
    )

    positions.liquidity = BigNumber.max(num(positions.liquidity).plus(tokenValue), 0).toString()
    positions.uusdLiquidity = BigNumber.max(num(positions.uusdLiquidity).plus(uusdValue), 0).toString()
    positions.lpShares = BigNumber.max(num(positions.lpShares).plus(lpShares), 0).toString()

    return repo.save(positions)
  }

  async addAsCollateralPosition(
    token: string,
    amount: string,
    repo = this.positionsRepo
  ): Promise<AssetPositionsEntity> {
    const positions = await this.getPositions(
      { token },
      { select: ['token', 'asCollateral'] },
      repo
    )

    positions.asCollateral = BigNumber.max(num(positions.asCollateral).plus(amount), 0).toString()

    return repo.save(positions)
  }

  async addStakePosition(
    token: string,
    stakeAmount: string,
    repo = this.positionsRepo
  ): Promise<AssetPositionsEntity> {
    const positions = await this.getPositions({ token }, { select: ['token', 'lpStaked'] }, repo)

    positions.lpStaked = BigNumber.max(num(positions.lpStaked).plus(stakeAmount), 0).toString()

    return repo.save(positions)
  }
}

export function assetService(): AssetService {
  return Container.get(AssetService)
}
