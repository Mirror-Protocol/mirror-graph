import * as fs from 'fs'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions } from 'typeorm'
import { Service, Inject } from 'typedi'
import { ErrorTypes, APIError } from 'lib/error'
import { AssetEntity, GovEntity } from 'orm'
import { GovService } from 'services'
import config from 'config'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity) private readonly assetRepo: Repository<AssetEntity>,
    @Inject((type) => GovService) private readonly govService: GovService,
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

  async assetsToJSON(oracle: string): Promise<void> {
    const assets = {}
    const oracleInfo = { oracle, assets: {} }
    const assetEntities = await this.getAll()

    assetEntities.map((asset) => {
      const { address, symbol, name, pair, lpToken } = asset

      assets[address] = { symbol, name, pair, lpToken }

      if (symbol !== config.MIRROR_TOKEN_SYMBOL) {
        oracleInfo.assets[symbol.substring(1)] = address
      }
    })

    // save assets.json
    fs.writeFileSync('./data/assets.json', JSON.stringify(assets))
    // save address.json for oracle
    fs.writeFileSync('./data/address.json', JSON.stringify(oracleInfo))
  }
}
