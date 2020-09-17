import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class AssetContracts {
  @Field((type) => String, { nullable: true, description: 'token contract address' })
  token?: string

  @Field((type) => String, { nullable: true, description: 'lpToken contract address' })
  lpToken?: string

  @Field((type) => String, { nullable: true, description: 'mint contract address' })
  mint?: string

  @Field((type) => String, { nullable: true, description: 'market contract address' })
  market?: string

  @Field((type) => String, { nullable: true, description: 'staking contract address' })
  staking?: string

  @Field((type) => String, { nullable: true, description: 'oracle contract address' })
  oracle?: string
}
