import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class AssetBalance {
  @Field()
  symbol: string

  @Field()
  balance: string
}
