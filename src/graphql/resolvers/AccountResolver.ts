import { Resolver, Query, Mutation, Root, Arg, FieldResolver } from 'type-graphql'
import { AccountService, GovService } from 'services'
import { Account, AssetBalance, ValueAt } from 'graphql/schema'
import { AccountEntity } from 'orm'

@Resolver((of) => Account)
export class AccountResolver {
  constructor(
    private readonly accountService: AccountService,
    private readonly govService: GovService,
  ) {}

  @Query((returns) => Account, { nullable: true })
  async account(@Arg('address') address: string): Promise<Account> {
    return this.accountService.get({ address })
  }

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

  @Mutation((returns) => Account, { nullable: true })
  async newAccount(@Arg('address') address: string): Promise<Account | null> {
    return this.accountService.newAccount({ address, govId: this.govService.get().id })
  }

  @FieldResolver()
  async haveBalanceHistory(@Root() account: AccountEntity): Promise<boolean> {
    return this.accountService.haveBalanceHistory(account.address)
  }
}
