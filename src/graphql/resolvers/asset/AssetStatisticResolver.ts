import { Resolver, FieldResolver, Root, Arg } from 'type-graphql'
import { AssetEntity } from 'orm'
import { AssetStatistic, APR } from 'graphql/schema'
import { StatisticService } from 'services'
import { Network } from 'types'

@Resolver((of) => AssetStatistic)
export class AssetStatisticResolver {
  constructor(
    private readonly statisticService: StatisticService,
  ) {}

  @FieldResolver()
  async liquidity(
    @Root() asset: AssetEntity,
    @Arg('network', (type) => Network, { defaultValue: Network.COMBINE }) network: Network
  ): Promise<string> {
    return this.statisticService.getAssetLiquidity(network, asset.token)
  }

  @FieldResolver()
  async volume(
    @Root() asset: AssetEntity,
    @Arg('network', (type) => Network, { defaultValue: Network.COMBINE }) network: Network
  ): Promise<string> {
    return (await this.statisticService.getAsset24h(network, asset.token)).volume
  }

  @FieldResolver()
  async apr(
    @Root() asset: AssetEntity,
    @Arg('network', (type) => Network, { defaultValue: Network.TERRA }) network: Network
  ): Promise<APR> {
    return this.statisticService.getAssetAPR(network, asset.token)
  }
}
