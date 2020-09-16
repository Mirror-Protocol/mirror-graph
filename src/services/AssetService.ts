import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions } from 'typeorm'
import { Service, Inject } from 'typedi'
import { contractQuery } from 'lib/terra'
import { ErrorTypes, APIError } from 'lib/error'
import { num } from 'lib/num'
import { AssetEntity, GovEntity } from 'orm'
import { HistoryRanges, OraclePrice, MarketPool, ContractType } from 'types'
import { AssetOHLC, AssetHistory } from 'graphql/schema'
import { GovService, ContractService, OraclePriceService } from 'services'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity) private readonly assetRepo: Repository<AssetEntity>,
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => ContractService) private readonly contractService: ContractService,
    @Inject((type) => OraclePriceService) private readonly oraclePriceService: OraclePriceService
  ) {}

  get gov(): GovEntity {
    return this.govService.get()
  }

  async get(conditions: FindConditions<AssetEntity>): Promise<AssetEntity> {
    const asset = await this.assetRepo.findOne({
      ...conditions, gov: conditions.gov || this.gov,
    })

    if (!asset) {
      throw new APIError(ErrorTypes.INVALID_REQUEST_ERROR)
    }

    return asset
  }

  async getAll(): Promise<AssetEntity[]> {
    return this.assetRepo.find({ gov: this.gov })
  }

  async search(text?: string): Promise<AssetEntity[]> {
    return this.assetRepo.find({ gov: this.gov })
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
      return undefined
    }
    return contractQuery<OraclePrice>(oracleContract.address, { price: {} })
  }

  async getPool(asset: AssetEntity): Promise<MarketPool> {
    const marketContract = await this.contractService.get({ asset, type: ContractType.MARKET })
    if (!marketContract) {
      return undefined
    }
    return contractQuery<MarketPool>(marketContract.address, { pool: {} })
  }

  async getPrice(asset: AssetEntity): Promise<string> {
    const price = await this.getPool(asset)
      .then((pool) => num(pool.collateralPool).dividedBy(pool.assetPool).toFixed(6))
      .catch((error) => undefined)
    return num(price).isNaN() ? undefined : price
  }
}
