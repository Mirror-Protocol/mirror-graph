import { ObjectType, Field } from 'type-graphql'
import { AssetBalance } from 'graphql/schema'

@ObjectType({ simpleResolvers: true })
export class Account {
  @Field((type) => AssetBalance, { nullable: true, description: 'balance of specific symbol' })
  balance?: AssetBalance

  @Field((type) => [AssetBalance], { nullable: true, description: 'all asset balances' })
  balances?: AssetBalance[]
}
