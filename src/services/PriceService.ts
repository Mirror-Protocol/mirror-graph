import { Service, Inject } from 'typedi'
import { Repository, FindConditions } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { PriceEntity, AssetEntity } from 'orm'
import { AssetService, ContractService } from 'services'
import { num } from 'lib/num'

@Service()
export class PriceService {
  constructor(
    @InjectRepository(PriceEntity) private readonly priceRepo: Repository<PriceEntity>,
    @Inject((type) => ContractService) private readonly contractService: ContractService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {}

  async get(conditions: FindConditions<PriceEntity>): Promise<PriceEntity> {
    return this.priceRepo.findOne(conditions)
  }

  async getLatestPrice(asset: AssetEntity): Promise<PriceEntity> {
    return this.priceRepo.findOne({ asset }, { order: { datetime: 'DESC' } })
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
      priceEntity = Object.assign(new PriceEntity(), {
        asset,
        symbol: asset.symbol,
        open: price,
        high: price,
        low: price,
        close: price,
        datetime,
      })
    }

    return needSave ? this.priceRepo.save(priceEntity) : priceEntity
  }
}
