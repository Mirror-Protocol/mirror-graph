import { Resolver, Query, Arg, Args } from 'type-graphql'
import { ListedAsset, HistoryRanges, AssetOHLC, AssetHistory, QueryAssetArgs } from 'types'
import { AssetService } from 'services'

@Resolver()
export class AssetResolver {
  constructor(private readonly assetService: AssetService) {}

  @Query((returns) => ListedAsset, { description: 'Get asset' })
  async asset(
    @Arg('symbol') symbol: string, @Args() args: QueryAssetArgs
  ): Promise<ListedAsset> {
    const asset = await this.assetService.get({ symbol })
    return this.assetService.getListedAsset(asset, args)
  }

  @Query((returns) => [ListedAsset], { description: 'Get all listed assets' })
  async assets(@Args() args: QueryAssetArgs): Promise<ListedAsset[]> {
    return this.assetService.getListedAssets(args)
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
