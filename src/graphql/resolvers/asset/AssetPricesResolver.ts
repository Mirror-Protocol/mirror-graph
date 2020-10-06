import { Resolver, FieldResolver, Root, Arg } from 'type-graphql'
import { AssetEntity } from 'orm'
import { AssetPrices, AssetOHLC, PriceAt } from 'graphql/schema'
import { HistoryRanges } from 'types'
import { PriceService, OracleService } from 'services'

@Resolver((of) => AssetPrices)
export class AssetPricesResolver {
  constructor(
    private readonly priceService: PriceService,
    private readonly oracleService: OracleService,
  ) {}

  @FieldResolver()
  async price(@Root() asset: AssetEntity): Promise<string> {
    return this.priceService.getPrice(asset)
    // return this.priceService.getContractPrice(asset)
  }

  @FieldResolver()
  async priceAt(
    @Root() asset: AssetEntity, @Arg('timestamp') timestamp: number
  ): Promise<string> {
    return this.priceService.getPrice(asset, timestamp)
  }

  @FieldResolver()
  async history(
    @Root() asset: AssetEntity, @Arg('range', (type) => HistoryRanges) range: HistoryRanges
  ): Promise<PriceAt[]> {
    return this.priceService.getHistory(asset.token, range)
  }

  @FieldResolver()
  async ohlc(
    @Root() asset: AssetEntity,
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number
  ): Promise<AssetOHLC> {
    return this.priceService.getOHLC(asset.token, from, to)
  }

  @FieldResolver()
  async oraclePrice(@Root() asset: AssetEntity): Promise<string> {
    return this.oracleService.getPrice(asset)
  }

  @FieldResolver()
  async oraclePriceAt(
    @Root() asset: AssetEntity, @Arg('timestamp') timestamp: number
  ): Promise<string> {
    return this.oracleService.getPrice(asset, timestamp)
  }

  @FieldResolver()
  async oracleHistory(
    @Root() asset: AssetEntity, @Arg('range', (type) => HistoryRanges) range: HistoryRanges
  ): Promise<PriceAt[]> {
    return this.oracleService.getHistory(asset.token, range)
  }
}
