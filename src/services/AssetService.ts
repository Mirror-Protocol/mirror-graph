import * as bluebird from 'bluebird'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions } from 'typeorm'
import { Service, Inject } from 'typedi'
import { contractQuery, contractInfo } from 'lib/terra'
import { ErrorTypes, APIError } from 'lib/error'
import { num } from 'lib/num'
import { AssetEntity } from 'orm'
import {
  ListedAsset,
  AssetOHLC,
  AssetHistory,
  HistoryRanges,
  OraclePrice,
  MarketPool,
  ContractType,
} from 'types'
import { GovService, OraclePriceService } from 'services'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity) private readonly assetRepo: Repository<AssetEntity>,
    @Inject((type) => GovService) private readonly govService: GovService,
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

  async getListedAssets(): Promise<ListedAsset[]> {
    return bluebird.map(
      this.getAll(),
      async (asset) =>
        new ListedAsset(Object.assign(asset, { price: await this.getPrice(asset.symbol) }))
    )
  }

  async getOHLC(symbol: string, from: number, to: number): Promise<AssetOHLC> {
    const asset = await this.get({ symbol })
    return this.oraclePriceService.getOHLC(asset, from, to)
  }

  async getHistory(symbol: string, range: HistoryRanges): Promise<AssetHistory> {
    const asset = await this.get({ symbol })
    return this.oraclePriceService.getHistory(asset, range)
  }

  async getContractInfo(symbol: string): Promise<void> {
    const asset = await this.get({ symbol })
    console.log(await contractInfo(asset.getContract(ContractType.MINT).address))
    console.log(
      await contractQuery(asset.getContract(ContractType.MINT).address, { configGeneral: {} })
    )
    console.log(
      await contractQuery(asset.getContract(ContractType.MINT).address, { configAsset: {} })
    )
  }

  async getOraclePrice(symbol: string): Promise<OraclePrice> {
    const asset = await this.get({ symbol })
    return contractQuery<OraclePrice>(asset.getContract(ContractType.ORACLE).address, { price: {} })
  }

  async getPool(symbol: string): Promise<MarketPool> {
    const asset = await this.get({ symbol })
    return contractQuery<MarketPool>(asset.getContract(ContractType.MARKET).address, { pool: {} })
  }

  async getPrice(symbol: string): Promise<string> {
    const price = await this.getPool(symbol)
      .then((pool) => num(pool.collateralPool).dividedBy(pool.assetPool).toFixed(6))
      .catch((error) => '0')
    return num(price).isNaN() ? '0' : price
  }
}
