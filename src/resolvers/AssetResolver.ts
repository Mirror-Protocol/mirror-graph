import { Resolver, Query } from 'type-graphql'
import { AssetEntity } from 'orm'
import { AssetService } from 'services'

@Resolver((of) => AssetEntity)
export class AssetResolver {
  constructor(private readonly assetService: AssetService) {}

  @Query((returns) => [AssetEntity], { description: 'Get all listed assets' })
  assets(): Promise<AssetEntity[]> {
    return this.assetService.getAll()
  }
}
