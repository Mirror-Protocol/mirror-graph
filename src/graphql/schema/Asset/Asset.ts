import { ObjectType, Field } from 'type-graphql'
import { AssetPosition, AssetPrices } from 'graphql/schema'

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

  @Field((type) => AssetPosition)
  position: AssetPosition

  @Field((type) => AssetPrices, { nullable: true })
  prices?: AssetPrices
}
