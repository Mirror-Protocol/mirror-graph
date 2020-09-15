import { ObjectType, Field } from 'type-graphql'

@ObjectType()
export class MintPosition {
  @Field()
  collateralAmount: string

  @Field()
  assetAmount: string
}
