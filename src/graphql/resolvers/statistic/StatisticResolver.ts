import { Resolver, Query, FieldResolver, Arg } from 'type-graphql'
import { Statistic, LiquidityValue, TradingVolume } from 'graphql/schema'
import { StatisticService } from 'services'

@Resolver((of) => Statistic)
export class StatisticResolver {
  constructor(private readonly statisticService: StatisticService) {}

  @Query((returns) => Statistic)
  async statistic(): Promise<Statistic> {
    return await this.statisticService.statistic() as Statistic
  }

  @FieldResolver((type) => [LiquidityValue])
  async liquidityHistory(
    @Arg('from', { description: 'datetime' }) from: Date,
    @Arg('to', { description: 'datetime' }) to: Date
  ): Promise<LiquidityValue[]> {
    return this.statisticService.getLiquidityHistory(from.getTime(), to.getTime())
  }

  @FieldResolver((type) => [TradingVolume])
  async tradingVolumeHistory(
    @Arg('from', { description: 'datetime' }) from: Date,
    @Arg('to', { description: 'datetime' }) to: Date
  ): Promise<LiquidityValue[]> {
    return this.statisticService.getTradingVolumeHistory(from.getTime(), to.getTime())
  }
}
