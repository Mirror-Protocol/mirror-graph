
import * as bluebird from 'bluebird'
import { Raw } from 'typeorm'
import { Resolver, Query, Arg, InputType, Field } from 'type-graphql'
import { LimitOrder } from 'graphql/schema'
import { LimitOrderService } from 'services'
import { LimitOrderType } from 'types'

@InputType()
class LimitOrderFilterOption {
  @Field()
  token: string

  @Field()
  price: string
}

@Resolver((of) => LimitOrder)
export class LimitOrderResolver {
  constructor(private readonly limitOrderService: LimitOrderService) {}

  @Query((returns) => [LimitOrder], { description: 'Limit orders of token' })
  async limitOrders(
    @Arg('type', (type) => LimitOrderType) type: LimitOrderType,
    @Arg('options', type => [LimitOrderFilterOption]) options: LimitOrderFilterOption[],
  ): Promise<LimitOrder[]> {
    const orders = []

    await bluebird.map(options, async (option) => {
      orders.push(...await this.limitOrderService.getAll({
        where: {
          token: option.token,
          type,
          price: type === LimitOrderType.ASK
            ? Raw((alias) => `${alias} <= ${option.price}`)
            : Raw((alias) => `${alias} >= ${option.price}`),
        },
        order: { price: type === LimitOrderType.ASK ? 'ASC' : 'DESC' },
        take: 10
      }))
    })

    return orders
  }
}
