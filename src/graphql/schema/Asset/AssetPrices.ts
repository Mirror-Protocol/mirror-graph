import { ObjectType, Field } from 'type-graphql'
import { PriceAt } from 'graphql/schema'

@ObjectType({ simpleResolvers: true })
export class AssetPrices {
  @Field({ nullable: true, description: 'price' })
  price?: string

  @Field((type) => [PriceAt], { nullable: true, description: 'price history' })
  history?: PriceAt[]

  @Field({ nullable: true, description: 'oracle price' })
  oraclePrice?: string

  @Field((type) => [PriceAt], { nullable: true, description: 'oracle price history' })
  oracleHistory?: PriceAt[]
}
