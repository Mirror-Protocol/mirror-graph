import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class AssetPositions {
  @Field()
  mint: string

  @Field()
  liquidity: string

  @Field()
  uusdLiquidity: string

  @Field()
  pool: string

  @Field()
  uusdPool: string

  @Field()
  asCollateral: string
}
