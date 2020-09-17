import { ObjectType, Field, Int } from 'type-graphql'
import { AssetContracts, AssetPositions } from './'

@ObjectType()
export class Asset {
  @Field()
  symbol: string

  @Field()
  lpTokenSymbol: string

  @Field()
  name: string

  @Field()
  description: string

  @Field((type) => AssetContracts, { nullable: true })
  contracts?: AssetContracts

  @Field({ nullable: true, description: 'swap price' })
  price?: string

  @Field({ nullable: true, description: 'oracle price' })
  oraclePrice?: string

  @Field((type) => AssetPositions, { nullable: true })
  positions?: AssetPositions
}

@ObjectType()
export class AssetOHLC {
  @Field()
  symbol: string

  @Field()
  open: string

  @Field()
  high: string

  @Field()
  low: string

  @Field()
  close: string

  @Field((type) => Int)
  from: number

  @Field((type) => Int)
  to: number
}

@ObjectType()
export class HistoryPrice {
  @Field((type) => Int)
  timestamp: number

  @Field()
  price: string
}

@ObjectType()
export class AssetHistory {
  @Field()
  symbol: string

  @Field((type) => [HistoryPrice])
  history: HistoryPrice[]
}

@ObjectType()
export class AssetBalance {
  @Field()
  symbol: string

  @Field()
  balance: string
}
