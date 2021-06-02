import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class MirSupply {
  @Field()
  circulating: string

  @Field()
  liquidity: string

  @Field()
  staked: string
}
