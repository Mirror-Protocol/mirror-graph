import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class AssetStatistic {
  @Field({ nullable: true, description: 'liquidity of today' })
  liquidity?: string

  @Field({ nullable: true, description: 'trading volume of latest 24h' })
  volume?: string

  @Field({ nullable: true, description: 'lp token APR' })
  apr?: string

  @Field({ nullable: true, description: 'lp token APY' })
  apy?: string
}
