import { ObjectType, Field, Int } from 'type-graphql'
import { pick } from 'lodash'
import { AssetEntity } from 'orm'
import { ContractType } from 'types'

@ObjectType()
export class ListedAsset {
  constructor(asset: AssetEntity & { price: string }) {
    Object.assign(this, pick(asset, ['symbol', 'name', 'price']))
    this.token = asset.getContract(ContractType.TOKEN).address
    this.market = asset.getContract(ContractType.MARKET).address
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
