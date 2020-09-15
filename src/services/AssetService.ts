import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions } from 'typeorm'
import { Service, Inject } from 'typedi'
import { contractQuery } from 'lib/terra'
import { ErrorTypes, APIError } from 'lib/error'
import { num } from 'lib/num'
import { AssetEntity } from 'orm'
import {
  AssetOHLC,
  AssetHistory,
  HistoryRanges,
  OraclePrice,
  MarketPool,
  ContractType,
} from 'types'
import { GovService, ContractService, OraclePriceService } from 'services'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity) private readonly assetRepo: Repository<AssetEntity>,
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => ContractService) private readonly contractService: ContractService,
    @Inject((type) => OraclePriceService) private readonly oraclePriceService: OraclePriceService
  ) {}

  async get(conditions: FindConditions<AssetEntity>): Promise<AssetEntity> {
    const asset = await this.assetRepo.findOne({
      ...conditions,
      gov: conditions.gov || this.govService.get(),
    })

    if (!asset) {
      throw new APIError(ErrorTypes.INVALID_REQUEST_ERROR)
    }

    return asset
  }

  async getAll(): Promise<AssetEntity[]> {
    return this.assetRepo.find({ gov: this.govService.get() })
  }

  async getOHLC(asset: AssetEntity, from: number, to: number): Promise<AssetOHLC> {
    return this.oraclePriceService.getOHLC(asset, from, to)
  }

  async getHistory(asset: AssetEntity, range: HistoryRanges): Promise<AssetHistory> {
    return this.oraclePriceService.getHistory(asset, range)
  }

  async getOraclePrice(asset: AssetEntity): Promise<OraclePrice> {
    const oracleContract = await this.contractService.get({ asset, type: ContractType.ORACLE })
    if (!oracleContract) {
      return { price: '0', priceMultiplier: '1', lastUpdateTime: 0 }
    }
    return contractQuery<OraclePrice>(oracleContract.address, { price: {} })
  }

  async getPool(asset: AssetEntity): Promise<MarketPool> {
    const marketContract = await this.contractService.get({ asset, type: ContractType.MARKET })
    return contractQuery<MarketPool>(marketContract.address, { pool: {} })
  }

  async getPrice(asset: AssetEntity): Promise<string> {
    const price = await this.getPool(asset)
      .then((pool) => num(pool.collateralPool).dividedBy(pool.assetPool).toFixed(6))
      .catch((error) => '0')
    return num(price).isNaN() ? '0' : price
  }
}
