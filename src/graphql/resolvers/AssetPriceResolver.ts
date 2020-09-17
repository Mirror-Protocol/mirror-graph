/*
import { Resolver, Query, Arg } from 'type-graphql'
import { HistoryRanges } from 'types'
import { AssetOHLC, PriceAt } from 'graphql/schema'
import { AssetService } from 'services'

@Resolver()
export class AssetPriceResolver {
  constructor(
    private readonly assetService: AssetService,
  ) {}

  @Query((returns) => AssetHistory, { description: 'Get asset price history' })
  async assetHistory(
    @Arg('symbol') symbol: string,
    @Arg('range', (type) => HistoryRanges) range: HistoryRanges
  ): Promise<AssetHistory> {
    return this.assetService.getHistory(await this.assetService.get({ symbol }), range)
  }

  @Query((returns) => AssetOHLC, { description: 'Get asset Open/High/Low/Close' })
  async assetOHLC(
    @Arg('symbol') symbol: string,
    @Arg('from', { description: 'datetime' }) from: Date,
    @Arg('to', { description: 'datetime' }) to: Date
  ): Promise<AssetOHLC> {
    return this.assetService.getOHLC(await this.assetService.get({ symbol }), from.getTime(), to.getTime())
  }
}
*/