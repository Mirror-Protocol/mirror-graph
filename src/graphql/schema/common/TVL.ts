import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class TVL {
  @Field()
  total: string

  @Field()
  liquidity: string

  @Field()
  collateral: string

  @Field()
  stakedMir: string
}
