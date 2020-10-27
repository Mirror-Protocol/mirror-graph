import { ObjectType, Field } from 'type-graphql'
import { AssetBalance } from 'graphql/schema'

@ObjectType({ simpleResolvers: true })
export class Account {
  @Field()
  address: string

  @Field((type) => String, { nullable: true, description: 'balance of specific symbol' })
  balance?: string

  @Field((type) => [AssetBalance], { nullable: true, description: 'all asset balances' })
  balances?: AssetBalance[]
}
