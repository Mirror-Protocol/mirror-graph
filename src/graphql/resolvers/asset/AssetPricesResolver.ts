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
    // return this.priceService.getPrice(asset)
    return this.priceService.getContractPrice(asset)
  }

  @FieldResolver()
  async priceAt(
    @Root() asset: AssetEntity, @Arg('datetime', { description: 'datetime' }) datetime: Date
  ): Promise<string> {
    return this.priceService.getPrice(asset, datetime.getTime())
  }

  @FieldResolver()
  async history(
    @Root() asset: AssetEntity, @Arg('range', (type) => HistoryRanges) range: HistoryRanges
  ): Promise<PriceAt[]> {
    return this.priceService.getHistory(asset, range)
  }

  @FieldResolver()
  async ohlc(
    @Root() asset: AssetEntity,
    @Arg('from', { description: 'datetime' }) from: Date,
    @Arg('to', { description: 'datetime' }) to: Date
  ): Promise<AssetOHLC> {
    return this.priceService.getOHLC(asset, from.getTime(), to.getTime())
  }

  @FieldResolver()
  async oraclePrice(@Root() asset: AssetEntity): Promise<string> {
    return this.oracleService.getPrice(asset)
  }

  @FieldResolver()
  async oraclePriceAt(
    @Root() asset: AssetEntity, @Arg('datetime', { description: 'datetime' }) datetime: Date
  ): Promise<string> {
    return this.oracleService.getPrice(asset, datetime.getTime())
  }

  @FieldResolver()
  async oracleHistory(
    @Root() asset: AssetEntity, @Arg('range', (type) => HistoryRanges) range: HistoryRanges
  ): Promise<PriceAt[]> {
    return this.oracleService.getHistory(asset, range)
  }
}
