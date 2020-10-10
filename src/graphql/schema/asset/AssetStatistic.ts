import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class AssetStatistic {
  @Field({ nullable: true, description: 'trading volume of latest 24h' })
  volume24h?: string
}
