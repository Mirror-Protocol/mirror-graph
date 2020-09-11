import * as Bluebird from 'bluebird'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions } from 'typeorm'
import { Service, Inject } from 'typedi'
import { contractQuery, contractInfo } from 'lib/terra'
import { ErrorTypes, APIError } from 'lib/error'
import { num } from 'lib/num'
import { AssetEntity } from 'orm'
import { GovService, PriceService } from 'services'
import { ListedAsset, AssetOHLC, AssetHistory, HistoryRanges, OraclePrice, MarketPool } from 'types'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity) private readonly assetRepo: Repository<AssetEntity>,
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => PriceService) private readonly priceService: PriceService
  ) {}

  async get(conditions: FindConditions<AssetEntity>): Promise<AssetEntity> {
    const asset = await this.assetRepo.findOne({
      ...conditions,
      gov: conditions.gov || this.govService.getGov(),
    })

    if (!asset) {
      throw new APIError(ErrorTypes.INVALID_REQUEST_ERROR)
    }

    return asset
  }

  async getAll(): Promise<AssetEntity[]> {
    return this.assetRepo.find({ gov: this.govService.getGov() })
  }

  async getListedAssets(): Promise<ListedAsset[]> {
    return Bluebird.map(
      this.getAll(),
      async (asset) =>
        new ListedAsset(Object.assign(asset, { price: await this.getPrice(asset.symbol) }))
    )
  }

  async getOHLC(symbol: string, from: number, to: number): Promise<AssetOHLC> {
    const asset = await this.get({ symbol })
    return this.priceService.getOHLC(asset, from, to)
  }

  async getHistory(symbol: string, range: HistoryRanges): Promise<AssetHistory> {
    const asset = await this.get({ symbol })
    return this.priceService.getHistory(asset, range)
  }

  async getContractInfo(symbol: string): Promise<void> {
    const asset = await this.get({ symbol })
    console.log(await contractInfo(asset.mint))
    console.log(await contractQuery(asset.mint, { configGeneral: {} }))
    console.log(await contractQuery(asset.mint, { configAsset: {} }))
  }

  async getOraclePrice(symbol: string): Promise<OraclePrice> {
    const asset = await this.get({ symbol })
    return contractQuery<OraclePrice>(asset.oracle, { price: {} })
  }

  async getPool(symbol: string): Promise<MarketPool> {
    const asset = await this.get({ symbol })
    return contractQuery<MarketPool>(asset.market, { pool: {} })
  }

  async getPrice(symbol: string): Promise<string> {
    const price = await this.getPool(symbol)
      .then((pool) => num(pool.collateralPool).dividedBy(pool.assetPool).toFixed(6))
      .catch((error) => '0')
    return num(price).isNaN() ? '0' : price
  }
}
