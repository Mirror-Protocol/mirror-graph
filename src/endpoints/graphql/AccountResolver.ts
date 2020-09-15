import { Resolver, Query, Arg } from 'type-graphql'
import { AccountService, MintService, AssetService } from 'services'
import { AssetBalance, MintPosition } from 'types'

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

  @Query((returns) => MintPosition)
  async mintPosition(
    @Arg('address') address: string,
    @Arg('symbol') symbol: string
  ): Promise<MintPosition> {
    return this.mintService.getPosition(address, await this.assetService.get({ symbol }))
  }
}
