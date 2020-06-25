import { Resolver /*, Query*/ } from 'type-graphql'
import { Asset } from 'orm'
import { AssetService } from 'services'

@Resolver((of) => Asset)
export class AssetResolver {
  constructor(private readonly assetService: AssetService) {}

  // @Query((returns) => [Asset], { description: 'Get all listed assets' })
  // assets(): Promise<Asset[]> {
  //   return this.assetService.getAll()
  // }
}
