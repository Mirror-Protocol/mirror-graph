import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class AssetNews {
  @Field()
  datetime: Date

  @Field()
  headline: string

  @Field()
  source: string

  @Field()
  url: string

  @Field()
  summary: string
}
