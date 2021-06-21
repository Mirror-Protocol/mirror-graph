import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class Cdp {
  @Field()
  id: string

  @Field()
  address: string

  @Field()
  token: string

  @Field()
  mintAmount: string

  @Field()
  mintValue: string

  @Field()
  collateralToken: string

  @Field()
  collateralAmount: string

  @Field()
  collateralValue: string

  @Field()
  collateralRatio: string

  @Field()
  minCollateralRatio: string
}
