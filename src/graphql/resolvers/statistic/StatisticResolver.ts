import { Resolver, Query, FieldResolver, Arg } from 'type-graphql'
import { Statistic, HistoryValue } from 'graphql/schema'
import { StatisticService } from 'services'

@Resolver((of) => Statistic)
export class StatisticResolver {
  constructor(private readonly statisticService: StatisticService) {}

  @Query((returns) => Statistic)
  async statistic(): Promise<Statistic> {
    return await this.statisticService.statistic() as Statistic
  }

  @FieldResolver((type) => [HistoryValue])
  async liquidityHistory(
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number
  ): Promise<HistoryValue[]> {
    return this.statisticService.getLiquidityHistory(from, to)
  }

  @FieldResolver((type) => [HistoryValue])
  async tradingVolumeHistory(
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number
  ): Promise<HistoryValue[]> {
    return this.statisticService.getTradingVolumeHistory(from, to)
  }
}
