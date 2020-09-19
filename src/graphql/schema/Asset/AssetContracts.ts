import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class AssetContracts {
  @Field((type) => String, { nullable: true, description: 'token contract address' })
  token?: string

  @Field((type) => String, { nullable: true, description: 'lpToken contract address' })
  lpToken?: string

  @Field((type) => String, { nullable: true, description: 'pair contract address' })
  pair?: string
}
