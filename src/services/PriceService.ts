import { Service, Inject } from 'typedi'
import { Repository, FindConditions, LessThanOrEqual } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { num } from 'lib/num'
import { getOHLC, getHistory } from 'lib/price'
import { PriceEntity, AssetEntity } from 'orm'
import { HistoryRanges } from 'types'
import { AssetOHLC, PriceAt } from 'graphql/schema'
import { PoolService } from 'services'

@Service()
export class PriceService {
  constructor(
    @InjectRepository(PriceEntity) private readonly priceRepo: Repository<PriceEntity>,
    @Inject((type) => PoolService) private readonly poolService: PoolService,
  ) {}

  async get(conditions: FindConditions<PriceEntity>): Promise<PriceEntity> {
    return this.priceRepo.findOne(conditions)
  }

  async getPrice(asset: AssetEntity, timestamp: number = Date.now()): Promise<string> {
    const price = await this.priceRepo.findOne(
      { asset, datetime: LessThanOrEqual(new Date(timestamp)) },
      {
        select: ['close', 'datetime'],
        order: { datetime: 'DESC' }
      }
    )
    return price?.close
  }

  async getContractPrice(asset: AssetEntity): Promise<string> {
    const pool = await this.poolService.getPool(asset)
    try {
      const price = num(pool.collateralAmount).dividedBy(pool.assetAmount).toFixed(6)

      return num(price).isNaN() ? undefined : price
    } catch(error) {
      return undefined
    }
  }

  async setOHLC(
    asset: AssetEntity,
    timestamp: number,
    price: string,
    needSave = true
  ): Promise<PriceEntity> {
    const datetime = new Date(timestamp - (timestamp % 60000))
    let priceEntity = await this.get({ asset, datetime })

    if (priceEntity) {
      priceEntity.high = num(price).isGreaterThan(priceEntity.high) ? price : priceEntity.high
      priceEntity.low = num(price).isLessThan(priceEntity.low) ? price : priceEntity.low
      priceEntity.close = price
    } else {
      priceEntity = new PriceEntity({
        asset, open: price, high: price, low: price, close: price, datetime
      })
    }

    return needSave ? this.priceRepo.save(priceEntity) : priceEntity
  }

  async getOHLC(asset: AssetEntity, from: number, to: number): Promise<AssetOHLC> {
    return getOHLC<PriceEntity>(this.priceRepo, asset, from, to)
  }

  async getHistory(asset: AssetEntity, range: HistoryRanges): Promise<PriceAt[]> {
    return getHistory<PriceEntity>(this.priceRepo, asset, range)
  }
}
