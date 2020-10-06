import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class AssetBalance {
  @Field()
  token: string

  @Field()
  balance: string
}
