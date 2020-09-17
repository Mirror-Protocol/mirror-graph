import { Resolver, Query, Arg, Root, FieldResolver } from 'type-graphql'
import { AssetEntity } from 'orm'
import { ContractType } from 'types'
import { Asset, AssetContracts } from 'graphql/schema'
import { AssetService, ContractService } from 'services'

@Resolver((of) => Asset)
export class AssetResolver {
  constructor(
    private readonly assetService: AssetService,
    private readonly contractService: ContractService,
  ) {
  }

  @Query((returns) => Asset, { description: 'Get asset' })
  async asset(@Arg('symbol') symbol: string): Promise<Asset> {
    return this.assetService.get({ symbol })
  }

  @Query((returns) => [Asset], { description: 'Get all listed assets' })
  async assets(): Promise<Asset[]> {
    return this.assetService.getAll()
  }

  @FieldResolver()
  async contracts(@Root() asset: AssetEntity): Promise<AssetContracts> {
    const entities = await this.contractService.find({
      select: ['type', 'address'], where: { asset }
    })
    return {
      token: entities.find((entity) => entity.type === ContractType.TOKEN)?.address,
      lpToken: entities.find((entity) => entity.type === ContractType.LP_TOKEN)?.address,
      mint: entities.find((entity) => entity.type === ContractType.MINT)?.address,
      market: entities.find((entity) => entity.type === ContractType.MARKET)?.address,
      staking: entities.find((entity) => entity.type === ContractType.STAKING)?.address,
      oracle: entities.find((entity) => entity.type === ContractType.ORACLE)?.address,
    }
  }

  @FieldResolver()
  async positions(
    @Root() asset: AssetEntity, @Arg('address') address: string
  ): Promise<{ asset: AssetEntity; address: string }> {
    return { asset, address }
  }

  @FieldResolver()
  async prices(@Root() asset: AssetEntity): Promise<AssetEntity> {
    return asset
  }
}
