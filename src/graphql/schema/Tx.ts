import { ObjectType, Field, Int } from 'type-graphql'
import GraphQLJSON from 'graphql-type-json'
import { TxType, TxData } from 'types'

@ObjectType({ simpleResolvers: true })
export class Tx {
  @Field()
  createdAt: Date

  @Field((type) => Int)
  id: number

  @Field((type) => Int)
  height: number

  @Field()
  txHash: string

  @Field()
  address: string

  @Field((type) => TxType)
  type: TxType

  @Field((type) => GraphQLJSON)
  data: TxData

  @Field({ nullable: true })
  token?: string

  @Field()
  datetime: Date

  @Field()
  fee: string

  @Field({ nullable: true })
  memo?: string
}
