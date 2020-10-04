import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class LiquidityValue {
  @Field()
  timestamp: number

  @Field()
  value: string
}
