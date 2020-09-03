import { ObjectType, Field } from 'type-graphql'
import { pick } from 'lodash'
import { AssetEntity } from 'orm'

@ObjectType()
export class ListedAsset {
  constructor(asset: AssetEntity & { price: string }) {
    Object.assign(this, pick(asset, ['symbol', 'name', 'price', 'token', 'oracle']))
  }

  @Field()
  symbol: string

  @Field()
  name: string

  @Field({ description: 'token account address' })
  token: string

  @Field({ description: 'oracle account address' })
  oracle: string

  @Field()
  price: string
}
