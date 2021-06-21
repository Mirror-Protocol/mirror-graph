import { Resolver, FieldResolver, Root, Arg } from 'type-graphql'
import { limitedRange } from 'lib/utils'
import { AssetEntity } from 'orm'
import { AssetPrices, AssetOHLC, PriceAt } from 'graphql/schema'
import { PriceService, OracleService } from 'services'

@Resolver((of) => AssetPrices)
export class AssetPricesResolver {
  constructor(
    private readonly priceService: PriceService,
    private readonly oracleService: OracleService
  ) {}

  @FieldResolver()
  async price(@Root() asset: AssetEntity): Promise<string> {
    return this.priceService.getPrice(asset.token)
    // return this.priceService.getContractPrice(asset.pair)
  }

  @FieldResolver()
  async priceAt(@Root() asset: AssetEntity, @Arg('timestamp') timestamp: number): Promise<string> {
    return this.priceService.getPriceAt(asset.token, timestamp)
  }

  @FieldResolver()
  async history(
    @Root() asset: AssetEntity,
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number,
    @Arg('interval', { description: 'unit is minute' }) interval: number
  ): Promise<PriceAt[]> {
    const { to: limitedTo } = limitedRange(from, to, interval * 60000, 500)

    return this.priceService.getHistory(
      asset.token,
      from - (from % 60000),
      limitedTo - (limitedTo % 60000),
      interval
    )
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
    return this.oracleService.getPrice(asset.token)
  }

  @FieldResolver()
  async oraclePriceAt(
    @Root() asset: AssetEntity,
    @Arg('timestamp') timestamp: number
  ): Promise<string> {
    return this.oracleService.getPriceAt(asset.token, timestamp)
  }

  @FieldResolver()
  async oracleHistory(
    @Root() asset: AssetEntity,
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number,
    @Arg('interval', { description: 'unit is minute' }) interval: number
  ): Promise<PriceAt[]> {
    if (interval < 1 || interval > 43200) {
      throw new Error('interval range must be 1-43200')
    }

    const { to: limitedTo } = limitedRange(from, to, interval * 60000, 500)
    return this.oracleService.getHistory(
      asset.token,
      from - (from % 60000),
      limitedTo - (limitedTo % 60000),
      interval
    )
  }
}
