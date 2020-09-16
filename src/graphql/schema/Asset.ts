import { ObjectType, Field, Int } from 'type-graphql'
import { MintPosition } from '.'

@ObjectType()
export class Asset {
  @Field()
  symbol: string

  @Field()
  name: string

  @Field((type) => String, { nullable: true, description: 'token contract address' })
  token?: string

  @Field((type) => String, { nullable: true, description: 'mint contract address' })
  mint?: string

  @Field((type) => String, { nullable: true, description: 'market contract address' })
  market?: string

  @Field((type) => String, { nullable: true, description: 'staking contract address' })
  staking?: string

  @Field((type) => String, { nullable: true, description: 'lpToken contract address' })
  lpToken?: string

  @Field({ nullable: true, description: 'swap price' })
  price?: string

  @Field({ nullable: true, description: 'oracle price' })
  oraclePrice?: string

  @Field({ nullable: true })
  balance?: string

  @Field((type) => MintPosition, { nullable: true })
  mintPosition?: MintPosition

  @Field({ nullable: true })
  liquidityBalance?: string
}

@ObjectType()
export class AssetInfo {
  @Field()
  symbol: string

  @Field()
  price: string

  @Field()
  open: string

  @Field()
  high: string

  @Field()
  low: string

  @Field()
  close: string
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
