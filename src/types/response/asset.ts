import { ObjectType, Field, Int } from 'type-graphql'

@ObjectType()
export class ListedAsset {
  constructor(options: Partial<ListedAsset>) {
    Object.assign(this, options)
  }

  @Field()
  symbol: string

  @Field()
  name: string

  @Field((type) => String, { description: 'token contract address' })
  token: string

  @Field((type) => String, { description: 'market contract address' })
  market: string

  @Field({ nullable: true })
  price?: string
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
