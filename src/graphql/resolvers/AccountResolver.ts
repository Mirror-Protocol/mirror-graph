import { Resolver, Query, Arg } from 'type-graphql'
import { AccountService, MintService, AssetService } from 'services'
import { AssetBalance } from 'graphql/schema'

@Resolver()
export class AccountResolver {
  constructor(
    private readonly accountService: AccountService,
    private readonly assetService: AssetService,
    private readonly mintService: MintService,
  ) {}

  @Query((returns) => AssetBalance)
  async balance(
    @Arg('address') address: string,
    @Arg('symbol') symbol: string
  ): Promise<AssetBalance> {
    return this.accountService.getBalance(address, symbol)
  }

  @Query((returns) => [AssetBalance])
  async balances(@Arg('address') address: string): Promise<AssetBalance[]> {
    return this.accountService.getBalances(address)
  }
}