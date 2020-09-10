import * as Bluebird from 'bluebird'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions } from 'typeorm'
import { Service, Inject } from 'typedi'
import { AssetEntity } from 'orm'
import { ContractService, PriceService } from 'services'
import { ListedAsset, AssetOHLC, AssetHistory, HistoryRanges, OraclePrice } from 'types'
import { contractQuery, contractInfo } from 'lib/terra'
import { ErrorTypes, APIError } from 'lib/error'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity) private readonly assetRepo: Repository<AssetEntity>,
    @Inject((type) => ContractService) private readonly contractService: ContractService,
    @Inject((type) => PriceService) private readonly priceService: PriceService
  ) {}

  async get(conditions: FindConditions<AssetEntity>): Promise<AssetEntity> {
    const asset = await this.assetRepo.findOne({
      ...conditions,
      contract: conditions.contract || this.contractService.getContract(),
    })

    if (!asset) {
      throw new APIError(ErrorTypes.INVALID_REQUEST_ERROR)
    }

    return asset
  }

  async getAll(): Promise<AssetEntity[]> {
    const contract = this.contractService.getContract()
    return this.assetRepo.find({ contract })
  }

  async getListedAssets(): Promise<ListedAsset[]> {
    return Bluebird.map(
      this.getAll(),
      async (asset) =>
        new ListedAsset(
          Object.assign(asset, { price: (await this.priceService.getLatestPrice(asset)).close })
        )
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
}
