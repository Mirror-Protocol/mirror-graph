import { Resolver, Query, Arg } from 'type-graphql'
import { ListedAsset, HistoryRanges, AssetOHLC, AssetHistory } from 'types'
import { AssetService, PriceService } from 'services'

@Resolver()
export class AssetResolver {
  constructor(
    private readonly assetService: AssetService,
    private readonly priceService: PriceService
  ) {}

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
    const asset = await this.assetService.get({ symbol })
    return this.priceService.getHistory(asset, range)
  }

  @Query((returns) => AssetOHLC, { description: 'Get asset Open/High/Low/Close' })
  async assetOHLC(
    @Arg('symbol') symbol: string,
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number
  ): Promise<AssetOHLC> {
    const asset = await this.assetService.get({ symbol })
    return this.priceService.getOHLC(asset, from, to)
  }
}
