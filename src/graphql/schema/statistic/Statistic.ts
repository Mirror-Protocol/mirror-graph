import { ObjectType, Field } from 'type-graphql'
import { ValueAt } from './'

@ObjectType({ simpleResolvers: true })
export class Latest24h {
  @Field()
  transactions: string

  @Field()
  volume: string

  @Field()
  volumeChanged: string

  @Field()
  feeVolume: string

  @Field()
  mirVolume: string

  @Field()
  govAPR: string
}

@ObjectType({ simpleResolvers: true })
export class Statistic {
  @Field()
  assetMarketCap: string

  @Field()
  totalValueLocked: string

  @Field()
  collateralRatio: string

  @Field()
  latest24h: Latest24h

  @Field((type) => [ValueAt], { nullable: true })
  liquidityHistory: ValueAt[]

  @Field((type) => [ValueAt], { nullable: true })
  tradingHistory: ValueAt[]
}
