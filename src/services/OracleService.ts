import { Service, Inject } from 'typedi'
import { Repository, FindConditions } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { num } from 'lib/num'
import { getHistoryRangeValues } from 'lib/time'
import { contractQuery } from 'lib/terra'
import { OraclePriceEntity, AssetEntity } from 'orm'
import { HistoryRanges, ContractType, OraclePrice } from 'types'
import { AssetOHLC, PriceAt } from 'graphql/schema'
import { ContractService } from 'services'

@Service()
export class OracleService {
  constructor(
    @InjectRepository(OraclePriceEntity)
    private readonly oracleRepo: Repository<OraclePriceEntity>,
    @Inject((type) => ContractService) private readonly contractService: ContractService,
  ) {}

  async get(conditions: FindConditions<OraclePriceEntity>): Promise<OraclePriceEntity> {
    return this.oracleRepo.findOne(conditions)
  }

  async getPrice(asset: AssetEntity): Promise<string> {
    const price = await this.oracleRepo.findOne({ asset }, { order: { datetime: 'DESC' } })
    if (!price) {
      return undefined
    }
    return num(price.close).multipliedBy(price.priceMultiplier).toFixed(6)
  }

  async getContractPrice(asset: AssetEntity): Promise<string> {
    const oracleContract = await this.contractService.get({ asset, type: ContractType.ORACLE })
    if (!oracleContract) {
      return undefined
    }
    const oraclePrice = await contractQuery<OraclePrice>(oracleContract.address, { price: {} })
    if (!oraclePrice) {
      return undefined
    }
    return num(oraclePrice.price).multipliedBy(oraclePrice.priceMultiplier).toFixed(6)
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

    return needSave ? this.oracleRepo.save(priceEntity) : priceEntity
  }

  async getOHLC(asset: AssetEntity, from: number, to: number): Promise<AssetOHLC> {
    const ohlc = await this.oracleRepo
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

  async getHistory(asset: AssetEntity, range: HistoryRanges): Promise<PriceAt[]> {
    const to = Date.now()
    const { from, interval } = getHistoryRangeValues(to, range)

    const prices = await this.oracleRepo
      .createQueryBuilder()
      .select(['datetime', 'close'])
      .where('asset_id = :assetId', { assetId: asset.id })
      .andWhere('datetime BETWEEN :from AND :to', { from: new Date(from), to: new Date(to) })
      .andWhere("int4(date_part('minute', datetime)) % :interval = 0", { interval })
      .getRawMany()

    return prices.map((price) => ({
      timestamp: new Date(price.datetime).getTime(), price: price.close
    }))
  }
}
