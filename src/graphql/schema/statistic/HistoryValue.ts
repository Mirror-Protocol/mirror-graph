import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class HistoryValue {
  @Field()
  timestamp: number

  @Field()
  value: string
}
