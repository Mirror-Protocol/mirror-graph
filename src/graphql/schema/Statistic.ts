import { ObjectType, Field } from 'type-graphql'
import { ValueAt } from './common'

@ObjectType({ simpleResolvers: true })
export class TodayStatistic {
  @Field()
  transactions: string

  @Field()
  volume: string

  @Field()
  feeVolume: string

  @Field()
  mirVolume: string
}

@ObjectType({ simpleResolvers: true })
export class Statistic {
  @Field()
  network: string

  @Field()
  assetMarketCap: string

  @Field()
  totalValueLocked: string

  @Field()
  collateralRatio: string

  @Field()
  latest24h: TodayStatistic

  @Field()
  mirCirculatingSupply: string

  @Field()
  mirTotalSupply: string

  @Field()
  govAPR: string

  @Field((type) => [ValueAt], { nullable: true })
  liquidityHistory: ValueAt[]

  @Field((type) => [ValueAt], { nullable: true })
  tradingHistory: ValueAt[]
}
