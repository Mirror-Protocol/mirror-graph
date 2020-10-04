import { Resolver, Query } from 'type-graphql'
import { Statistic } from 'graphql/schema'
import { StatisticService } from 'services'

@Resolver((of) => Statistic)
export class StatisticResolver {
  constructor(private readonly statisticService: StatisticService) {}

  @Query((returns) => Statistic)
  async statistic(): Promise<Statistic> {
    return this.statisticService.statistic()
  }
}
