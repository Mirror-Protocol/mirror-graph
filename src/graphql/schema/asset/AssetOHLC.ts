import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class AssetOHLC {
  constructor(options: Partial<AssetOHLC>) {
    Object.assign(this, options)
  }

  @Field()
  from: number

  @Field()
  to: number

  @Field()
  open: string

  @Field()
  high: string

  @Field()
  low: string

  @Field()
  close: string
}
