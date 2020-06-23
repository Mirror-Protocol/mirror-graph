import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository } from 'typeorm'
import { Service } from 'typedi'
import { Asset } from 'orm'

@Service()
export class AssetService {
  constructor(@InjectRepository(Asset) private readonly assetRepo: Repository<Asset>) {}

  async getAll(): Promise<Asset[]> {
    return []
  }

  async get(symbol: string): Promise<Asset> {
    return this.assetRepo.findOne({ symbol })
  }
}
