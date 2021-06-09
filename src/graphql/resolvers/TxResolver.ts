import { Resolver, Query, Arg } from 'type-graphql'
import { Tx } from 'graphql/schema'
import { TxService } from 'services'

@Resolver((of) => Tx)
export class TxResolver {
  constructor(private readonly txService: TxService) {}

  @Query((returns) => [Tx])
  async txs(
    @Arg('account') account: string,
    @Arg('tag', { nullable: true, defaultValue: undefined }) tag: string,
    @Arg('offset', { defaultValue: 0 }) offset: number,
    @Arg('limit', { defaultValue: 100 }) limit: number
  ): Promise<Tx[]> {
    if (limit > 10000) {
      throw new Error('limit is too high')
    }
    return this.txService.getHistory(account, tag, offset, limit)
  }
}
