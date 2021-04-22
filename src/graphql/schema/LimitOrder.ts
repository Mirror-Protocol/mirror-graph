import { ObjectType, Field } from 'type-graphql'
import { LimitOrderType } from 'types'

@ObjectType({ simpleResolvers: true })
export class LimitOrder {
  @Field()
  id: string

  @Field()
  address: string

  @Field()
  token: string

  @Field((type) => LimitOrderType)
  type: LimitOrderType

  @Field()
  price: string

  @Field()
  amount: string

  @Field()
  uusdAmount: string

  @Field()
  filledAmount: string

  @Field()
  filledUusdAmount: string
}
