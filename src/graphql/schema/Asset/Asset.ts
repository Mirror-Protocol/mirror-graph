import { ObjectType, Field } from 'type-graphql'
import { AssetPositions, AssetPrices } from 'graphql/schema'

@ObjectType({ simpleResolvers: true })
export class Asset {
  @Field()
  symbol: string

  @Field()
  name: string

  @Field()
  lpToken: string

  @Field()
  pair: string

  @Field((type) => AssetPositions)
  positions: AssetPositions

  @Field((type) => AssetPrices, { nullable: true })
  prices?: AssetPrices
}
