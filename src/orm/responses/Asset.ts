import { ObjectType, Field } from 'type-graphql'
import { pick } from 'lodash'
import { AssetEntity } from 'orm'

@ObjectType()
export class ListedAsset extends AssetEntity {
  @Field()
  price: string

  apiResponse(): object {
    return pick(this, ['symbol', 'name', 'price'])
  }
}
