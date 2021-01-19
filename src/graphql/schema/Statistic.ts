import { ObjectType, Field } from 'type-graphql'
import { ValueAt } from './common'
import { Network } from 'types'

@ObjectType({ simpleResolvers: true })
export class PeriodStatistic {
  @Field()
  transactions: string

  @Field()
  volume: string

  @Field()
  feeVolume: string

  @Field()
  mirVolume: string

  @Field()
  activeUsers: string
}

@ObjectType({ simpleResolvers: true })
export class Statistic {
  @Field((type) => Network)
  network: Network

  @Field()
  assetMarketCap: string

  @Field()
  totalValueLocked: string

  @Field()
  collateralRatio: string

  @Field()
  latest24h: PeriodStatistic

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
