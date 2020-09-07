import { Resolver, Query, Arg } from 'type-graphql'
import { AccountService } from 'services'
import { AssetBalance } from 'types'

@Resolver()
export class AccountResolver {
  constructor(private readonly accountService: AccountService) {}

  @Query((returns) => [AssetBalance])
  async balances(@Arg('address') address: string): Promise<AssetBalance[]> {
    return this.accountService.getBalances(address)
  }
}
