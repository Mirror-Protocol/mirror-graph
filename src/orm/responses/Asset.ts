import { ObjectType, Field } from 'type-graphql'
import { AssetEntity } from 'orm'

@ObjectType()
export class ListedAsset extends AssetEntity {
  @Field()
  price: string
}
