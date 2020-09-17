import { ObjectType, Field, Int } from 'type-graphql'

@ObjectType()
export class AssetOHLC {
  @Field()
  symbol: string

  @Field()
  open: string

  @Field()
  high: string

  @Field()
  low: string

  @Field()
  close: string

  @Field((type) => Int)
  from: number

  @Field((type) => Int)
  to: number
}
