import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class AssetPositions {
  @Field()
  mint: string

  @Field()
  pool: string

  @Field()
  uusdPool: string

  @Field()
  asCollateral: string

  @Field()
  lpShares: string

  @Field()
  lpStaked: string
}
