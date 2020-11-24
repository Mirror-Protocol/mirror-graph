import { Repository, FindConditions, FindOneOptions, getConnection } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service, Inject } from 'typedi'
import { getLatestBlockHeight, lcd } from 'lib/terra'
import { errorHandler } from 'lib/error'
import { num, BigNumber } from 'lib/num'
import { AssetBalance, ValueAt } from 'graphql/schema'
import { GovService, txService } from 'services'
import { AccountEntity, BalanceEntity } from 'orm'
import { TxType } from 'types'

@Service()
export class AccountService {
  constructor(
    @Inject((type) => GovService) private readonly govService: GovService,
    @InjectRepository(AccountEntity) private readonly repo: Repository<AccountEntity>,
    @InjectRepository(BalanceEntity) private readonly balanceRepo: Repository<BalanceEntity>
  ) {}

  async newAccount(account: Partial<AccountEntity>): Promise<AccountEntity | undefined> {
    const accountEntity = await this.get({ address: account.address })
      || new AccountEntity(account)

    Object.assign(accountEntity, account)

    if (accountEntity.isAppUser) {
      const { address } = account

      // if uusd balance is null but have uusd, record uusd balance
      const balanceEntity = await this.getBalanceEntity({ address, token: 'uusd' })
      if (!balanceEntity) {
        const { balance: uusdAmount } = await this.getBalance(address, 'uusd')

        if (uusdAmount && num(uusdAmount).isGreaterThan(0)) {
          const latestHeight = await getLatestBlockHeight().catch(errorHandler)
          const datetime = new Date(Date.now())
          await txService().newTx({
            height: latestHeight || -1,
            txHash: '',
            datetime,
            govId: this.govService.get().id,
            type: TxType.REGISTRATION,
            address,
            data: { uusdBalance: uusdAmount },
            uusdChange: uusdAmount,
          })
          await this.addBalance(address, 'uusd', '1', uusdAmount, datetime)
        }
      }
    }

    return this.repo.save(accountEntity)
  }

  async haveBalanceHistory(account: string): Promise<boolean> {
    return (await this.balanceRepo.findOne({ address: account })) ? true : false
  }

  async get(
    conditions: FindConditions<AccountEntity>,
    options?: FindOneOptions<AccountEntity>,
    repo = this.repo
  ): Promise<AccountEntity> {
    return repo.findOne(conditions, options)
  }

  async getBalanceEntity(
    conditions: FindConditions<BalanceEntity>,
    options?: FindOneOptions<BalanceEntity>,
    repo = this.balanceRepo
  ): Promise<BalanceEntity> {
    return repo.findOne(conditions, options)
  }

  async getBalance(address: string, token: string): Promise<AssetBalance> {
    if (token === 'uusd') {
      const coin = (await lcd.bank.balance(address)).get(token)
      return { token, balance: coin?.amount?.toString() || '0', averagePrice: '0' }
    }

    const balanceEntity = await this.getBalanceEntity(
      { address, token },
      { select: ['balance', 'averagePrice'], order: { id: 'DESC' } }
    )
    if (!balanceEntity) return

    return {
      token,
      balance: balanceEntity.balance,
      averagePrice: balanceEntity.averagePrice,
    }
  }

  async getBalances(address: string, repo = this.balanceRepo): Promise<AssetBalance[]> {
    const balances = await repo
      .createQueryBuilder()
      .select('DISTINCT ON (token) token', 'token')
      .addSelect('balance')
      .addSelect('average_price', 'averagePrice')
      .where('address = :address', { address })
      .orderBy('token')
      .addOrderBy('id', 'DESC')
      .getRawMany()

    return balances.filter((row) => num(row.balance).isGreaterThan(0))
  }

  async getBalanceHistory(
    address: string,
    from: number,
    to: number,
    interval: number
  ): Promise<ValueAt[]> {
    return getConnection().query(
      'SELECT * FROM public.balanceHistory($1, $2, $3, $4)',
      [address, new Date(from), new Date(to), interval]
    )
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

      const totalBalance = BigNumber.max(num(entity.balance).plus(amount), 0)

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
}

export function accountService(): AccountService {
  return Container.get(AccountService)
}
