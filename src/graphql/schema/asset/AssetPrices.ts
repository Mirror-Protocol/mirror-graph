import { ObjectType, Field } from 'type-graphql'
import { PriceAt, AssetOHLC } from 'graphql/schema'

@ObjectType({ simpleResolvers: true })
export class AssetPrices {
  @Field({ nullable: true, description: 'price' })
  price?: string

  @Field({ nullable: true, description: 'price at a specified time' })
  priceAt?: string

  @Field((type) => [PriceAt], { nullable: true, description: 'price history, max row is 500' })
  history?: PriceAt[]

  @Field((type) => AssetOHLC, { nullable: true, description: 'open/high/low/close price' })
  ohlc?: AssetOHLC

  @Field({ nullable: true, description: 'oracle price' })
  oraclePrice?: string

  @Field({ nullable: true, description: 'oracle price at a specified time' })
  oraclePriceAt?: string

  @Field((type) => [PriceAt], { nullable: true, description: 'oracle price history, max row is 500' })
  oracleHistory?: PriceAt[]
}
