import { Resolver, Query } from 'type-graphql'
import { ListedAsset } from 'orm'
import { AssetService } from 'services'

@Resolver((of) => ListedAsset)
export class AssetResolver {
  constructor(private readonly assetService: AssetService) {}

  @Query((returns) => [ListedAsset], { description: 'Get all listed assets' })
  assets(): Promise<ListedAsset[]> {
    return this.assetService.getListedAssets()
  }
}
