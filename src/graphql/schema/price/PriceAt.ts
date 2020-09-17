import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class PriceAt {
  @Field({ nullable: true })
  timestamp?: number

  @Field({ nullable: true })
  price?: string
}
