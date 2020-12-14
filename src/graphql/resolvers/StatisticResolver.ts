import { Resolver, Query, FieldResolver, Arg } from 'type-graphql'
import { Statistic, Latest24h, ValueAt, AccountBalance } from 'graphql/schema'
import { StatisticService } from 'services'

@Resolver((of) => Statistic)
export class StatisticResolver {
  constructor(private readonly statisticService: StatisticService) {}

  @Query((returns) => Statistic)
  async statistic(): Promise<Statistic> {
    return await this.statisticService.statistic() as Statistic
  }

  @Query((returns) => [AccountBalance])
  async richlist(
    @Arg('token') token: string,
    @Arg('offset', { defaultValue: 0 }) offset: number,
    @Arg('limit', { defaultValue: 500 }) limit: number,
  ): Promise<AccountBalance[]> {
    if (limit > 1000) {
      throw new Error('limit is too high')
    }
    return this.statisticService.richlist(token, offset, limit)
  }

  @FieldResolver((type) => Latest24h)
  async latest24h(): Promise<Latest24h> {
    return this.statisticService.latest24h()
  }

  @FieldResolver((type) => [ValueAt])
  async liquidityHistory(
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number
  ): Promise<ValueAt[]> {
    return this.statisticService.getLiquidityHistory(from, to)
  }

  @FieldResolver((type) => [ValueAt])
  async tradingVolumeHistory(
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number
  ): Promise<ValueAt[]> {
    return this.statisticService.getTradingVolumeHistory(from, to)
  }
}
