import { ObjectType, Field } from 'type-graphql'
import { APR } from 'graphql/schema'

@ObjectType({ simpleResolvers: true })
export class AssetStatistic {
  @Field({ nullable: true, description: 'liquidity value for long' })
  liquidity?: string

  @Field({ nullable: true, description: 'short value' })
  shortValue?: string

  @Field({ nullable: true, description: 'trading volume of latest 24h' })
  volume?: string

  @Field((type) => APR, { nullable: true, description: 'asset long/short apr' })
  apr?: APR

  @Field({ nullable: true, description: 'asset market cap' })
  marketCap?: string

  @Field({ nullable: true, description: 'locked collateral value' })
  collateralValue?: string

  @Field({ nullable: true, description: 'min collateral ratio' })
  minCollateralRatio?: string
}
