import { Resolver, Query, Arg } from 'type-graphql'
import { AccountService } from 'services'
import { Account, AssetBalance } from 'graphql/schema'

@Resolver((of) => Account)
export class AccountResolver {
  constructor(
    private readonly accountService: AccountService,
  ) {}

  @Query((returns) => String)
  async balance(
    @Arg('address') address: string, @Arg('token') token: string
  ): Promise<string> {
    return this.accountService.getBalance(address, token)
  }

  @Query((returns) => [AssetBalance])
  async balances(@Arg('address') address: string): Promise<AssetBalance[]> {
    return this.accountService.getBalances(address)
  }
}
