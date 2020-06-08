import { ObjectType, Field } from 'type-graphql'

@ObjectType()
export class Asset {
  @Field()
  ticker: string

  @Field()
  name: string
}
