import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class APR {
  @Field()
  long: string

  @Field()
  short: string
}
