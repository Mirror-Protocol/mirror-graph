import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class APR {
  @Field({ description: 'long farm apr'})
  long: string

  @Field({ description: 'short farm apr'})
  short: string
}
