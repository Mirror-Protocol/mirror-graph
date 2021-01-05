import { Resolver, FieldResolver, Root } from 'type-graphql'
import { AssetEntity } from 'orm'
import { AssetStatistic } from 'graphql/schema'
import { StatisticService } from 'services'

@Resolver((of) => AssetStatistic)
export class AssetStatisticResolver {
  constructor(
    private readonly statisticService: StatisticService,
  ) {}

  @FieldResolver()
  async volume(@Root() asset: AssetEntity): Promise<string> {
    return this.statisticService.getTodayAssetVolume(asset.token)
  }

  @FieldResolver()
  async apr(@Root() asset: AssetEntity): Promise<string> {
    return this.statisticService.getAssetAPR(asset.token)
  }
}
