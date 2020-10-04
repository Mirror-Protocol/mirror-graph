import { Resolver, Query, FieldResolver } from 'type-graphql'
import { Statistic } from 'graphql/schema'
import { StatisticService } from 'services'

@Resolver((of) => Statistic)
export class StatisticResolver {
  constructor(private readonly statisticService: StatisticService) {}

  @Query((returns) => Statistic)
  async statistic(): Promise<Statistic> {
    return new Statistic()
  }

  @FieldResolver()
  async assetMarketCap(): Promise<string> {
    return this.statisticService.assetMarketCap()
  }

  @FieldResolver()
  async totalValueLocked(): Promise<string> {
    return this.statisticService.totalValueLocked()
  }
}
