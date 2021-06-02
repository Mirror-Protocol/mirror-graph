import { Resolver, Query, FieldResolver, Root, Arg } from 'type-graphql'
import { limitedRange } from 'lib/utils'
import { Statistic, PeriodStatistic, ValueAt, AccountBalance } from 'graphql/schema'
import { StatisticService } from 'services'
import { Network } from 'types'

@Resolver((of) => Statistic)
export class StatisticResolver {
  constructor(private readonly statisticService: StatisticService) {}

  @Query((returns) => Statistic)
  async statistic(
    @Arg('network', (type) => Network, { defaultValue: Network.COMBINE }) network: Network
  ): Promise<Statistic> {
    return await this.statisticService.statistic(network) as Statistic
  }

  @Query((returns) => [AccountBalance])
  async richlist(
    @Arg('token') token: string,
    @Arg('offset', { defaultValue: 0 }) offset: number,
    @Arg('limit', { defaultValue: 1000 }) limit: number,
  ): Promise<AccountBalance[]> {
    if (limit > 10000) {
      throw new Error('limit is too high')
    }
    return this.statisticService.richlist(token, offset, limit)
  }

  @FieldResolver((type) => PeriodStatistic)
  async today(@Root() statistic: Statistic): Promise<PeriodStatistic> {
    return this.statisticService.today(statistic.network)
  }

  @FieldResolver((type) => PeriodStatistic)
  async latest24h(@Root() statistic: Statistic): Promise<PeriodStatistic> {
    return this.statisticService.latest24h(statistic.network)
  }

  @FieldResolver((type) => String)
  async govAPR(): Promise<string> {
    return this.statisticService.getGovAPR()
  }

  @FieldResolver((type) => [ValueAt])
  async liquidityHistory(
    @Root() statistic: Statistic,
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number
  ): Promise<ValueAt[]> {
    const { to: limitedTo } = limitedRange(from, to, 86400000, 365) // limit 365days

    return this.statisticService.getLiquidityHistory(statistic.network, from, limitedTo)
  }

  @FieldResolver((type) => [ValueAt])
  async feeHistory(
    @Root() statistic: Statistic,
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number
  ): Promise<ValueAt[]> {
    const { to: limitedTo } = limitedRange(from, to, 86400000, 365) // limit 365days

    return this.statisticService.getFeeHistory(statistic.network, from, limitedTo)
  }

  @FieldResolver((type) => [ValueAt])
  async tradingVolumeHistory(
    @Root() statistic: Statistic,
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number
  ): Promise<ValueAt[]> {
    const { to: limitedTo } = limitedRange(from, to, 86400000, 365) // limit 365days

    return this.statisticService.getTradingVolumeHistory(statistic.network, from, limitedTo)
  }
}
