import memoize from 'memoizee-decorator'
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
import { find } from 'lodash'
import { loadEthAssets } from 'lib/data'
import { num } from 'lib/num'
import { queryAssetInfos } from 'lib/meth'
import { AssetEntity, AssetPositionsEntity, AssetNewsEntity, PriceEntity } from 'orm'
import { EthAsset, EthAssetInfos, EthAssets } from 'types'

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

  @memoize({})
  getEthAssets(): EthAssets {
    return loadEthAssets()
  }

  @memoize({})
  async getEthAsset(token: string): Promise<EthAsset> {
    return find(this.getEthAssets(), (ethAsset) => ethAsset.terraToken === token)
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getEthAssetInfos(): Promise<EthAssetInfos> {
    return queryAssetInfos()
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

    positions.asCollateral = num(positions.asCollateral).plus(amount).toString()

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
