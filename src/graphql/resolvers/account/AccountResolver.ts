import { Resolver, Query, Arg } from 'type-graphql'
import { AccountService } from 'services'
import { Account, AssetBalance, ValueAt } from 'graphql/schema'

@Resolver((of) => Account)
export class AccountResolver {
  constructor(
    private readonly accountService: AccountService,
  ) {}

  @Query((returns) => AssetBalance, { nullable: true })
  async balance(
    @Arg('address') address: string, @Arg('token') token: string
  ): Promise<AssetBalance> {
    return this.accountService.getBalance(address, token)
  }

  @Query((returns) => [AssetBalance])
  async balances(@Arg('address') address: string): Promise<AssetBalance[]> {
    return this.accountService.getBalances(address)
  }

  @Query((returns) => [ValueAt])
  async balanceHistory(
    @Arg('address') address: string,
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number,
    @Arg('interval', { description: 'unit is minute' }) interval: number,
  ): Promise<ValueAt[]> {
    return this.accountService.getBalanceHistory(address, from, to, interval)
  }
}
