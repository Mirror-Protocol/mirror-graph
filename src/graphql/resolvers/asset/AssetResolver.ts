import { Resolver, Query, Arg, Root, FieldResolver } from 'type-graphql'
import { AssetEntity } from 'orm'
import { Asset, AssetNews } from 'graphql/schema'
import { AssetService } from 'services'
import { AssetStatus } from 'types'

@Resolver((of) => Asset)
export class AssetResolver {
  constructor(private readonly assetService: AssetService) {}

  @Query((returns) => Asset, { description: 'Get asset' })
  async asset(@Arg('token') token: string): Promise<Asset> {
    return this.assetService.get({ token })
  }

  @Query((returns) => [Asset], { description: 'Get all listed assets' })
  async assets(): Promise<Asset[]> {
    return this.assetService.getAll({ where: { status: AssetStatus.LISTING }})
  }

  @FieldResolver()
  async prices(@Root() asset: AssetEntity): Promise<AssetEntity> {
    return asset
  }

  @FieldResolver()
  async statistic(@Root() asset: AssetEntity): Promise<AssetEntity> {
    return asset
  }

  @FieldResolver()
  async news(@Root() asset: AssetEntity): Promise<AssetNews[]> {
    return this.assetService.getNews(asset.token)
  }
}
