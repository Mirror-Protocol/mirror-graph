import { ObjectType, Field } from 'type-graphql'
import { AssetContracts, AssetPositions, AssetPrices } from 'graphql/schema'
import { AssetCategoty } from 'types'

@ObjectType({ simpleResolvers: true })
export class Asset {
  @Field()
  symbol: string

  @Field()
  lpTokenSymbol: string

  @Field()
  name: string

  @Field()
  description: string

  @Field((type) => AssetCategoty)
  category: AssetCategoty

  @Field((type) => AssetContracts, { nullable: true, description: 'contract address' })
  contracts?: AssetContracts

  @Field((type) => AssetPositions, { nullable: true })
  positions?: AssetPositions

  @Field((type) => AssetPrices, { nullable: true })
  prices?: AssetPrices
}
