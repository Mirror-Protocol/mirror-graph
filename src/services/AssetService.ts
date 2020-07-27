import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository } from 'typeorm'
import { Service } from 'typedi'
import { Asset } from 'orm'
import { contractQuery } from 'lib/terra'

@Service()
export class AssetService {
  constructor(@InjectRepository(Asset) private readonly assetRepo: Repository<Asset>) {}

  async get(symbol: string): Promise<Asset> {
    return this.assetRepo.findOne({ symbol })
  }

  async getAll(): Promise<Asset[]> {
    return this.assetRepo.find()
  }

  async create(options: Partial<Asset>): Promise<Asset> {
    return this.assetRepo.save(options)
  }

  async getPrice(symbol: string): Promise<{ price: string }> {
    const asset = await this.get(symbol)
    console.log(asset)
    return contractQuery(asset.oracle, { price: {} })
  }
}
