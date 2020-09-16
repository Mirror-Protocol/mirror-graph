import { ObjectType, Field } from 'type-graphql'

@ObjectType()
export class AssetPositions {
  @Field({ nullable: true, description: 'token balance' })
  token?: string

  @Field({ nullable: true, description: 'lp token balance(liquidity)' })
  lpToken?: string

  @Field({ nullable: true, description: 'minted balance of token' })
  mint?: string

  @Field({ nullable: true, description: 'collateral balance' })
  collateral?: string
}
