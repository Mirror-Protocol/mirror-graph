import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class TradingVolume {
  @Field()
  timestamp: number

  @Field()
  value: string
}
