import { Service } from 'typedi'
import { Repository, FindConditions } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { num } from 'lib/num'
import { getHistoryRangeValues } from 'lib/time'
import { OraclePriceEntity, AssetEntity } from 'orm'
import { HistoryRanges } from 'types'
import { AssetHistory, AssetOHLC, HistoryPrice } from 'graphql/schema'

@Service()
export class OraclePriceService {
  constructor(
    @InjectRepository(OraclePriceEntity)
    private readonly oraclePriceRepo: Repository<OraclePriceEntity>
  ) {}

  async get(conditions: FindConditions<OraclePriceEntity>): Promise<OraclePriceEntity> {
    return this.oraclePriceRepo.findOne(conditions)
  }

  async getLatestPrice(asset: AssetEntity): Promise<OraclePriceEntity> {
    return this.oraclePriceRepo.findOne({ asset }, { order: { datetime: 'DESC' } })
  }

  async setOHLC(
    asset: AssetEntity,
    timestamp: number,
    price: string,
    needSave = true
  ): Promise<OraclePriceEntity> {
    const datetime = new Date(timestamp - (timestamp % 60000))
    let priceEntity = await this.get({ asset, datetime })

    if (priceEntity) {
      priceEntity.high = num(price).isGreaterThan(priceEntity.high) ? price : priceEntity.high
      priceEntity.low = num(price).isLessThan(priceEntity.low) ? price : priceEntity.low
      priceEntity.close = price
    } else {
      priceEntity = Object.assign(new OraclePriceEntity(), {
        asset,
        open: price,
        high: price,
        low: price,
        close: price,
        datetime,
      })
    }

    return needSave ? this.oraclePriceRepo.save(priceEntity) : priceEntity
  }

  async getOHLC(asset: AssetEntity, from: number, to: number): Promise<AssetOHLC> {
    const ohlc = await this.oraclePriceRepo
      .createQueryBuilder()
      .select('(array_agg(open ORDER BY datetime ASC))[1]', 'open')
      .addSelect('MAX(high)', 'high')
      .addSelect('MIN(low)', 'low')
      .addSelect('(array_agg(close ORDER BY datetime DESC))[1]', 'close')
      .where('asset_id = :assetId', { assetId: asset.id })
      .andWhere('datetime BETWEEN :from AND :to', { from: new Date(from), to: new Date(to) })
      .getRawOne()

    return Object.assign(new AssetOHLC(), {
      from,
      to,
      ...ohlc,
    })
  }

  async getHistory(asset: AssetEntity, range: HistoryRanges): Promise<AssetHistory> {
    const to = Date.now()
    const { from, interval } = getHistoryRangeValues(to, range)

    const prices = await this.oraclePriceRepo
      .createQueryBuilder()
      .select(['datetime', 'close'])
      .where('asset_id = :assetId', { assetId: asset.id })
      .andWhere('datetime BETWEEN :from AND :to', { from: new Date(from), to: new Date(to) })
      .andWhere("int4(date_part('minute', datetime)) % :interval = 0", { interval })
      .getRawMany()

    return Object.assign(new AssetHistory(), {
      history: prices.map((price) => ({
        timestamp: new Date(price.datetime).getTime(),
        price: price.close,
      })) as HistoryPrice[],
    })
  }
}
