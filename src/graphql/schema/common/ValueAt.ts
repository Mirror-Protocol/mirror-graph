import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class ValueAt {
  @Field()
  timestamp: number

  @Field()
  value: string
}
