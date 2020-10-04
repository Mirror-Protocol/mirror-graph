import { ObjectType, Field } from 'type-graphql'
import { LiquidityValue, TradingVolume } from './'

@ObjectType({ simpleResolvers: true })
export class Statistic {
  @Field()
  assetMarketCap: string

  @Field()
  totalValueLocked: string

  @Field()
  collateralRatio: string

  @Field((type) => [LiquidityValue], { nullable: true })
  liquidityHistory: LiquidityValue[]

  @Field((type) => [TradingVolume], { nullable: true })
  tradingHistory: TradingVolume[]
}
