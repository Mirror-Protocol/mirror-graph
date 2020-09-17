import { ObjectType, Field } from 'type-graphql'

@ObjectType()
export class AssetBalance {
  @Field()
  symbol: string

  @Field()
  balance: string
}
