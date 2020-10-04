import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class Statistic {
  @Field()
  assetMarketCap: string

  @Field()
  totalValueLocked: string

  @Field()
  collateralRatio: string
}
