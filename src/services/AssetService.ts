import * as bluebird from 'bluebird'
import { addMinutes, addDays, startOfDay } from 'date-fns'
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
import { fetchAggregates, TimeSpan } from 'lib/polygon'
import { num, BigNumber } from 'lib/num'
import * as logger from 'lib/logger'
import { AssetEntity, AssetPositionsEntity, AssetNewsEntity, PriceEntity } from 'orm'
import config from 'config'

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

    // if first liquidity, fill history price from iex
    if (positions.liquidity === '0' && positions.uusdLiquidity === '0') {
      const asset = await this.get({ token })
      const price = await this.priceRepo.findOne({ token })

      if (!price && asset && asset.symbol !== config.MIRROR_TOKEN_SYMBOL) {
        const symbol = asset.symbol.substring(1)

        const minFrom = startOfDay(addDays(datetime, -1)).getTime()
        const minTo = addMinutes(datetime, -1).getTime()
        const hourFrom = startOfDay(addDays(minFrom, -7)).getTime()
        const hourTo = minFrom
        const dayFrom = startOfDay(new Date('2015-01-01')).getTime()
        const dayTo = hourFrom

        // collect ohlc of days
        await this.fillPrice(symbol, asset.token, TimeSpan.DAY, dayFrom, dayTo)
        // collect ohlc of hours
        await this.fillPrice(symbol, asset.token, TimeSpan.HOUR, hourFrom, hourTo)
        // collect ohlc of minutes
        await this.fillPrice(symbol, asset.token, TimeSpan.MINUTE, minFrom, minTo)
      }

    }

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

  async fillPrice(
    symbol: string, token: string, timespan: TimeSpan, from: number, to: number, useOnlyDay = false
  ): Promise<void> {
    logger.info(`fill price: ${symbol}, timespan: ${timespan}`)
    const ohlcs = await fetchAggregates(symbol, timespan, from, to)

    await bluebird.mapSeries(ohlcs, async (ohlc) => {
      const timestamp = timespan === TimeSpan.DAY
        ? startOfDay(ohlc.timestamp)
        : ohlc.timestamp

      const { open, high, low, close } = ohlc
      const priceEntity = new PriceEntity({
        token, open, high, low, close, datetime: new Date(timestamp)
      })

      await this.priceRepo.save(priceEntity)
    })
  }
}

export function assetService(): AssetService {
  return Container.get(AssetService)
}
