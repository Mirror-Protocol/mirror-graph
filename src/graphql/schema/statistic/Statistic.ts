import { ObjectType, Field } from 'type-graphql'
import { HistoryValue } from './'

@ObjectType({ simpleResolvers: true })
export class Statistic {
  @Field()
  assetMarketCap: string

  @Field()
  totalValueLocked: string

  @Field()
  collateralRatio: string

  @Field()
  feeValue24h: string

  @Field((type) => [HistoryValue], { nullable: true })
  liquidityHistory: HistoryValue[]

  @Field((type) => [HistoryValue], { nullable: true })
  tradingHistory: HistoryValue[]
}
