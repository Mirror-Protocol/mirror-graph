import { ObjectType, Field } from 'type-graphql'
import { ValueAt } from './'

@ObjectType({ simpleResolvers: true })
export class Statistic {
  @Field()
  assetMarketCap: string

  @Field()
  totalValueLocked: string

  @Field()
  collateralRatio: string

  @Field()
  transactions24h: string

  @Field()
  feeValue24h: string

  @Field()
  tradingVolume24h: string

  @Field()
  mirVolume24h: string

  @Field((type) => [ValueAt], { nullable: true })
  liquidityHistory: ValueAt[]

  @Field((type) => [ValueAt], { nullable: true })
  tradingHistory: ValueAt[]
}
