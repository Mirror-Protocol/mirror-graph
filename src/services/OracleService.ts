import { Service, Inject } from 'typedi'
import { Repository, FindConditions, LessThanOrEqual } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { num } from 'lib/num'
import { getOHLC, getHistory } from 'lib/price'
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

  async getPrice(asset: AssetEntity, timestamp: number = Date.now()): Promise<string> {
    const price = await this.oracleRepo.findOne(
      { asset, datetime: LessThanOrEqual(new Date(timestamp)) },
      {
        select: ['close', 'datetime'],
        order: { datetime: 'DESC' }
      }
    )
    return price?.close
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
      priceEntity = new OraclePriceEntity({
        asset, open: price, high: price, low: price, close: price, datetime
      })
    }

    return needSave ? this.oracleRepo.save(priceEntity) : priceEntity
  }

  async getOHLC(asset: AssetEntity, from: number, to: number): Promise<AssetOHLC> {
    return getOHLC<OraclePriceEntity>(this.oracleRepo, asset, from, to)
  }

  async getHistory(asset: AssetEntity, range: HistoryRanges): Promise<PriceAt[]> {
    return getHistory<OraclePriceEntity>(this.oracleRepo, asset, range)
  }
}
