import * as bluebird from 'bluebird'
import { Repository, FindConditions, FindOneOptions, FindManyOptions, getConnection, EntityManager, getManager } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service, Inject } from 'typedi'
import { lcd, isNativeToken, getContractStore } from 'lib/terra'
import { getTokenBalance, getGovStaker } from 'lib/mirror'
import { num } from 'lib/num'
import * as logger from 'lib/logger'
import { AssetBalance, ValueAt } from 'graphql/schema'
import { GovService, PriceService } from 'services'
import { AccountEntity, BalanceEntity, TxEntity } from 'orm'

@Service()
export class AccountService {
  constructor(
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => PriceService) private readonly priceService: PriceService,
    @InjectRepository(AccountEntity) private readonly repo: Repository<AccountEntity>,
    @InjectRepository(BalanceEntity) private readonly balanceRepo: Repository<BalanceEntity>
  ) {}

  async newAccount(account: Partial<AccountEntity>, manager?: EntityManager): Promise<AccountEntity | undefined> {
    const insertOrUpdate = async (account: Partial<AccountEntity>, manager?: EntityManager) => {
      const repo = manager.getRepository(AccountEntity)
      const accountEntity =
        (
          await this.get(
            { address: account.address },
            { lock: { mode: 'pessimistic_write' } },
            repo
          )
        )
        || new AccountEntity(account)

      Object.assign(accountEntity, account)

      return repo.save(accountEntity)
    }

    let accountEntity
    if (manager) {
      accountEntity = await insertOrUpdate(account, manager)
    } else {
      await getManager().transaction(async (manager: EntityManager) => {
        accountEntity = await insertOrUpdate(account, manager)
      })
    }

    // sync uusd balance
    accountEntity?.isAppUser && await this.syncBalance(account.address, 'uusd')

    return accountEntity
  }

  async syncBalance(address: string, token: string): Promise<void> {
    const dbAmount = (await this.getBalanceEntity({ address, token }, { order: { id: 'DESC' } }))?.balance || '0'
    const chainAmount = isNativeToken(token)
      ? (await lcd.bank.balance(address)).get(token)?.amount?.toString() || '0'
      : await getTokenBalance(token, address)
    const diff = num(chainAmount).minus(dbAmount).toString()

    if (diff !== '0') {
      await this.addBalance(
        address,
        token,
        dbAmount === '0' ? (await this.priceService.getPrice(token)) || '0' : '0',
        diff,
        new Date(Date.now())
      )
    }
  }

  async syncBalances(address: string): Promise<void> {
    const assets = await this.getBalances(address)

    await bluebird.mapSeries(assets, async (asset) => this.syncBalance(address, asset.token))
  }

  async haveBalanceHistory(address: string): Promise<boolean> {
    return (await this.balanceRepo.findOne({ address })) ? true : false
  }

  async get(
    conditions: FindConditions<AccountEntity>,
    options?: FindOneOptions<AccountEntity>,
    repo = this.repo
  ): Promise<AccountEntity> {
    return repo.findOne(conditions, options)
  }

  async getAll(options?: FindManyOptions<AccountEntity>, repo = this.repo): Promise<AccountEntity[]> {
    return repo.find(options)
  }

  async getBalanceEntity(
    conditions: FindConditions<BalanceEntity>,
    options?: FindOneOptions<BalanceEntity>,
    repo = this.balanceRepo
  ): Promise<BalanceEntity> {
    return repo.findOne(conditions, options)
  }

  async getBalance(address: string, token: string): Promise<AssetBalance> {
    if (isNativeToken(token)) {
      const coin = (await lcd.bank.balance(address)).get(token)
      return { token, balance: coin?.amount?.toString() || '0', averagePrice: '1' }
    }

    const balanceEntity = await this.getBalanceEntity(
      { address, token },
      { select: ['balance', 'averagePrice'], order: { id: 'DESC' } }
    )
    if (balanceEntity) {
      return {
        token,
        balance: balanceEntity.balance,
        averagePrice: balanceEntity.averagePrice,
      }
    }

    const { balance } = await getContractStore(token, { balance: { address } })

    return { token, balance, averagePrice: '1' }
  }

  async getBalances(address: string, repo = this.balanceRepo): Promise<AssetBalance[]> {
    const balances = await repo
      .createQueryBuilder()
      .select('DISTINCT ON (token) token', 'token')
      .addSelect('balance')
      .addSelect('average_price', 'averagePrice')
      .where('address = :address', { address })
      .andWhere(`token != 'uusd'`)
      .orderBy('token')
      .addOrderBy('id', 'DESC')
      .getRawMany()

    const uusdBalance = await this.getBalance(address, 'uusd').catch(logger.error)
    uusdBalance && balances.push(uusdBalance)

    return balances.filter((row) => num(row.balance).isGreaterThan(0))
  }

  async getBalanceHistory(
    address: string,
    from: number,
    to: number,
    interval: number
  ): Promise<ValueAt[]> {
    return getConnection().query('SELECT * FROM public.balanceHistory($1, $2, $3, $4)', [
      address,
      new Date(from),
      new Date(to),
      interval,
    ])
  }

  async addBalance(
    address: string,
    token: string,
    price: string,
    amount: string,
    datetime: Date,
    repo = this.balanceRepo
  ): Promise<BalanceEntity> {
    const latest = await this.getBalanceEntity({ address, token }, { order: { id: 'DESC' } }, repo)
    let entity

    if (latest) {
      entity = new BalanceEntity({
        address,
        token,
        averagePrice: latest.averagePrice,
        balance: latest.balance,
        datetime,
        govId: this.govService.get().id,
      })

      const totalBalance = num(entity.balance).plus(amount)

      if (totalBalance.isLessThanOrEqualTo(0)) {
        entity.averagePrice = '0'
      } else if (num(price).isGreaterThan(0)) {
        // average = (last.avg_price*last.amount + current.avg_price*current.amount) / total_amount
        const value = num(price).multipliedBy(amount)
        const lastValue = num(entity.averagePrice).multipliedBy(entity.balance)

        entity.averagePrice = lastValue.plus(value).dividedBy(totalBalance).toString()
      }

      entity.balance = totalBalance.toString()
    } else {
      entity = new BalanceEntity({
        address,
        token,
        averagePrice: price,
        balance: amount,
        datetime,
        govId: this.govService.get().id,
      })
    }

    return repo.save(entity)
  }

  async removeBalance(
    address: string,
    token: string,
    amount: string,
    datetime: Date,
    repo = this.balanceRepo
  ): Promise<BalanceEntity> {
    const latest = await this.getBalanceEntity({ address, token }, { order: { id: 'DESC' } }, repo)
    if (!latest) {
      return
    }

    const balance = num(latest.balance).minus(amount).toString()

    const entity = new BalanceEntity({
      address,
      token,
      averagePrice: balance !== '0' ? latest.averagePrice : '0',
      balance,
      datetime,
      govId: this.govService.get().id,
    })

    return repo.save(entity)
  }

  async updateGovStaked(address: string, stake: string, withdraw: string, manager?: EntityManager): Promise<AccountEntity> {
    const update = async (manager: EntityManager): Promise<AccountEntity> => {
      const repo = manager.getRepository(AccountEntity)
      const txRepo = manager.getRepository(TxEntity)

      const accountEntity = await this.get({ address }, { lock: { mode: 'pessimistic_write' } }, repo)
      if (!accountEntity) {
        return
      }

      if (!accountEntity.govStaked) {
        const history = await txRepo
          .createQueryBuilder()
          .select(`(SELECT COALESCE(SUM((data->>'amount')::numeric), 0) FROM tx WHERE address='${address}' AND type='GOV_STAKE')`, 'staked')
          .addSelect(`(SELECT COALESCE(SUM((data->>'amount')::numeric), 0) FROM tx WHERE address='${address}' AND type='GOV_UNSTAKE')`, 'unstaked')
          .addSelect(`(SELECT COALESCE(SUM((data->>'amount')::numeric), 0) FROM tx WHERE address='${address}' AND type='GOV_WITHDRAW_VOTING_REWARDS')`, 'withdrawn')
          .getRawOne()

        accountEntity.govStaked = num(history.staked).minus(history.unstaked).toFixed(0)
        accountEntity.withdrawnGovRewards = history.withdrawn
      }

      accountEntity.govStaked = num(accountEntity.govStaked).plus(stake).toFixed(0)
      accountEntity.withdrawnGovRewards = num(accountEntity.withdrawnGovRewards).plus(withdraw).toFixed(0)

      return repo.save(accountEntity)
    }

    return manager
      ? update(manager)
      : getManager().transaction(async (manager: EntityManager) => update(manager))
  }

  async getAccumulatedGovReward(address: string): Promise<string> {
    const accountEntity = await this.get({ address })
    if (!accountEntity || !accountEntity.govStaked) {
      return '0'
    }

    const { balance, pendingVotingRewards } = await getGovStaker(this.govService.get().gov, address)

    return num(balance)
      .plus(pendingVotingRewards)
      .plus(accountEntity.withdrawnGovRewards)
      .minus(accountEntity.govStaked)
      .toFixed(0)
  }
}

export function accountService(): AccountService {
  return Container.get(AccountService)
}
