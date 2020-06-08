import { Service } from 'typedi'
import { Asset } from 'orm'

@Service()
export class AssetService {
  async getAll(): Promise<Asset[]> {
    return []
  }
}
