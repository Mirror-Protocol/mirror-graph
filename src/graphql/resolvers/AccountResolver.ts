import { Resolver, Query, Mutation, Root, Arg, FieldResolver } from 'type-graphql'
import GraphQLJSON from 'graphql-type-json'
import { history as moonpayHistory } from 'lib/moonpay'
import { AccountService, AirdropService, TxService } from 'services'
import { Account, AssetBalance, ValueAt } from 'graphql/schema'
import { AccountEntity } from 'orm'

@Resolver((of) => Account)
export class AccountResolver {
  constructor(
    private readonly accountService: AccountService,
    private readonly airdropService: AirdropService,
    private readonly txService: TxService,
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

  @Query((returns) => String)
  async tradingVolume(
    @Arg('address') address: string,
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number,
  ): Promise<string> {
    // fix: hardcoded timestamp
    return this.txService.getTradingVolume(address, 1608213600000, 1609423200000)
    // return this.txService.getTradingVolume(address, from, to)
  }

  @Query((returns) => GraphQLJSON, { nullable: true })
  async moonpayHistory(
    @Arg('transactionId') transactionId: string,
    @Arg('limit', { defaultValue: 1 }) limit?: number,
  ): Promise<unknown | null> {
    return moonpayHistory(transactionId, limit)
  }

  @Query((returns) => GraphQLJSON, { nullable: true })
  async airdrop(
    @Arg('network', { defaultValue: 'TERRA', description: 'TERRA or ETH' }) network: string,
    @Arg('address') address: string,
  ): Promise<unknown | null> {
    return this.airdropService.getAirdrop(network, address)
  }

  @Mutation((returns) => Account, { nullable: true })
  async connect(
    @Arg('address') address: string,
    @Arg('isAppUser', { defaultValue: false }) isAppUser: boolean,
    @Arg('email', { nullable: true }) email?: string,
  ): Promise<Account | null> {
    return this.accountService.newAccount({ address, isAppUser, email })
  }

  @FieldResolver()
  async haveBalanceHistory(@Root() account: AccountEntity): Promise<boolean> {
    return this.accountService.haveBalanceHistory(account.address)
  }
}
