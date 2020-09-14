import { Resolver, Query, Arg } from 'type-graphql'
import { ListedAsset, HistoryRanges, AssetOHLC, AssetHistory } from 'types'
import { AssetService } from 'services'

@Resolver()
export class AssetResolver {
  constructor(private readonly assetService: AssetService) {}

  @Query((returns) => [ListedAsset], { description: 'Get all listed assets' })
  async assets(): Promise<ListedAsset[]> {
    return this.assetService.getListedAssets()
  }

  @Query((returns) => AssetHistory, { description: 'Get asset price history' })
  async assetHistory(
    @Arg('symbol') symbol: string,
    @Arg('range', (type) => HistoryRanges, {
      description: `${Object.keys(HistoryRanges).map((key) => HistoryRanges[key])}`,
    })
    range: HistoryRanges
  ): Promise<AssetHistory> {
    return this.assetService.getHistory(await this.assetService.get({ symbol }), range)
  }

  @Query((returns) => AssetOHLC, { description: 'Get asset Open/High/Low/Close' })
  async assetOHLC(
    @Arg('symbol') symbol: string,
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number
  ): Promise<AssetOHLC> {
    return this.assetService.getOHLC(await this.assetService.get({ symbol }), from, to)
  }
}
