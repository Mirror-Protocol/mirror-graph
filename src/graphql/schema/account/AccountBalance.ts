import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class AccountBalance {
  @Field()
  address: string

  @Field()
  balance: string
}
