import { Container, Service } from 'typedi'
import { Repository, FindConditions, LessThanOrEqual } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { num } from 'lib/num'
import { getOHLC, getHistory } from 'lib/price'
import { getPairPool } from 'lib/mirror'
import { PriceEntity, AssetEntity } from 'orm'
import { HistoryRanges } from 'types'
import { AssetOHLC, PriceAt } from 'graphql/schema'

@Service()
export class PriceService {
  constructor(
    @InjectRepository(PriceEntity) private readonly repo: Repository<PriceEntity>,
  ) {}

  async get(conditions: FindConditions<PriceEntity>, repo = this.repo): Promise<PriceEntity> {
    return repo.findOne(conditions)
  }

  async getPrice(asset: AssetEntity, timestamp: number = Date.now(), repo = this.repo): Promise<string> {
    const price = await repo.findOne(
      { asset, datetime: LessThanOrEqual(new Date(timestamp)) },
      {
        select: ['close', 'datetime'],
        order: { datetime: 'DESC' }
      }
    )
    return price?.close
  }

  async getContractPrice(asset: AssetEntity): Promise<string> {
    const pool = await getPairPool(asset.pair)
    try {
      const price = num(pool.collateralAmount).dividedBy(pool.assetAmount).toFixed(6)

      return num(price).isNaN() ? undefined : price
    } catch(error) {
      return undefined
    }
  }

  async setOHLC(
    token: string, timestamp: number, price: string, repo = this.repo, needSave = true
  ): Promise<PriceEntity> {
    const datetime = new Date(timestamp - (timestamp % 60000))
    let priceEntity = await repo.findOne({ token, datetime })

    if (priceEntity) {
      priceEntity.high = num(price).isGreaterThan(priceEntity.high) ? price : priceEntity.high
      priceEntity.low = num(price).isLessThan(priceEntity.low) ? price : priceEntity.low
      priceEntity.close = price
    } else {
      priceEntity = new PriceEntity({
        token, open: price, high: price, low: price, close: price, datetime
      })
    }

    return needSave ? repo.save(priceEntity) : priceEntity
  }

  async getOHLC(token: string, from: number, to: number, repo = this.repo): Promise<AssetOHLC> {
    return getOHLC<PriceEntity>(repo, token, from, to)
  }

  async getHistory(token: string, range: HistoryRanges, repo = this.repo): Promise<PriceAt[]> {
    return getHistory<PriceEntity>(repo, token, range)
  }
}

export function priceService(): PriceService {
  return Container.get(PriceService)
}
