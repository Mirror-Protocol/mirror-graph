import { ObjectType, Field } from 'type-graphql'
import { APR } from 'graphql/schema'

@ObjectType({ simpleResolvers: true })
export class AssetStatistic {
  @Field({ nullable: true, description: 'liquidity of today' })
  liquidity?: string

  @Field({ nullable: true, description: 'trading volume of latest 24h' })
  volume?: string

  @Field((type) => APR, { nullable: true, description: 'asset long/short apr' })
  apr?: APR
}
