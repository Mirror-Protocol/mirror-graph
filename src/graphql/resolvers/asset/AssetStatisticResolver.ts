import { Resolver, FieldResolver, Root, Arg } from 'type-graphql'
import { AssetEntity } from 'orm'
import { AssetStatistic } from 'graphql/schema'
import { StatisticService } from 'services'

@Resolver((of) => AssetStatistic)
export class AssetStatisticResolver {
  constructor(
    private readonly statisticService: StatisticService,
  ) {}

  @FieldResolver()
  async volume(
    @Root() asset: AssetEntity,
    @Arg('network', { defaultValue: "COMBINE" }) network: string
  ): Promise<string> {
    const fromDayUTC = Date.now() - (Date.now() % 86400000)

    return this.statisticService.getAssetDayVolume(network, asset.token, fromDayUTC, fromDayUTC)
  }

  @FieldResolver()
  async apr(@Root() asset: AssetEntity): Promise<string> {
    return this.statisticService.getAssetAPR(asset.token)
  }
}
