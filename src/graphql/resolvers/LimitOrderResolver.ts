import { Raw } from 'typeorm'
import { Resolver, Query, Arg } from 'type-graphql'
import { LimitOrder } from 'graphql/schema'
import { LimitOrderService } from 'services'
import { LimitOrderType } from 'types'

@Resolver((of) => LimitOrder)
export class LimitOrderResolver {
  constructor(private readonly limitOrderService: LimitOrderService) {}

  @Query((returns) => [LimitOrder], { description: 'Limit orders of token' })
  async limitOrders(
    @Arg('token') token: string,
    @Arg('type', (type) => LimitOrderType) type: LimitOrderType,
    @Arg('price') price: string,
    @Arg('limit', { defaultValue: 10 }) limit: number,
  ): Promise<LimitOrder[]> {
    if (limit < 1 || limit > 100) {
      throw new Error('limit range is 1-100')
    }

    return this.limitOrderService.getAll({
      where: {
        token,
        type,
        price: type === LimitOrderType.ASK
          ? Raw((alias) => `${alias} <= ${price}`)
          : Raw((alias) => `${alias} >= ${price}`),
      },
      order: { price: type === LimitOrderType.ASK ? 'ASC' : 'DESC' },
      take: limit
    })
  }
}
