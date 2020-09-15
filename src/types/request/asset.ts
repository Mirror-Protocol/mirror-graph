import { ArgsType, Field } from 'type-graphql'

export interface QueryAsset {
  address?: string
  balance?: boolean
  price?: boolean
  oraclePrice?: boolean
  token?: boolean
  mint?: boolean
  market?: boolean 
  lpToken?: boolean
  staking?: boolean
}

@ArgsType()
export class QueryAssetArgs implements QueryAsset {
  @Field({ nullable: true })
  address?: string

  @Field({ nullable: true })
  balance?: boolean

  @Field({ nullable: true })
  price?: boolean

  @Field({ nullable: true })
  oraclePrice?: boolean

  @Field({ nullable: true })
  token?: boolean

  @Field({ nullable: true })
  lpToken?: boolean

  @Field({ nullable: true })
  mint?: boolean

  @Field({ nullable: true })
  market?: boolean 

  @Field({ nullable: true })
  staking?: boolean 
}
