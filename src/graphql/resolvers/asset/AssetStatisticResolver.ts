import { Resolver, FieldResolver, Root, Arg } from 'type-graphql'
import { AssetEntity } from 'orm'
import { AssetStatistic } from 'graphql/schema'
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
    return this.statisticService.getAssetDayVolume(network, asset.token, Date.now())
  }

  @FieldResolver()
  async apr(
    @Root() asset: AssetEntity,
    @Arg('network', (type) => Network, { defaultValue: Network.TERRA }) network: Network
  ): Promise<string> {
    return this.statisticService.getAssetAPR(network, asset.token)
  }
}
