import { Resolver, Query, Arg } from 'type-graphql'
import { ListedAsset } from 'types'
import { AssetService } from 'services'

@Resolver()
export class AssetResolver {
  constructor(private readonly assetService: AssetService) {}

  @Query((returns) => [ListedAsset], { description: 'Get all listed assets' })
  async assets(): Promise<ListedAsset[]> {
    return this.assetService.getListedAssets()
  }

  @Query((returns) => [ListedAsset], { description: 'Get asset price history' })
  async assetHistory(
    @Arg('symbol') symbol: string,
    @Arg('range') range: string
  ): Promise<ListedAsset[]> {
    return this.assetService.getListedAssets()
  }
}
