import { Repository, FindConditions, FindOneOptions, getConnection } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service } from 'typedi'
import { lcd } from 'lib/terra'
import { num, BigNumber } from 'lib/num'
import { AssetBalance, ValueAt } from 'graphql/schema'
import { AccountEntity, BalanceEntity } from 'orm'

@Service()
export class AccountService {
  constructor(
    @InjectRepository(AccountEntity) private readonly repo: Repository<AccountEntity>,
    @InjectRepository(BalanceEntity) private readonly balanceRepo: Repository<BalanceEntity>
  ) {}

  async newAccount(account: Partial<AccountEntity>, repo = this.repo): Promise<AccountEntity | undefined> {
    const accountEntity = await this.get({ address: account.address }, undefined, repo)
    if (accountEntity) {
      return accountEntity
    }

    return repo.save(account)
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
      return { token, balance: coin.amount.toString(), averagePrice: '0' }
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
    const values = (await getConnection().query('SELECT * FROM public.balanceHistory($1, $2, $3, $4)', [
      address, new Date(from), new Date(to), interval,
    ]) as { timestamp: number; assetValue: string; investedValue: string }[]).reverse()
    if (values.length < 1) {
      return []
    }

    const ustBalance = num((await this.getBalance(address, 'uusd')).balance)

    let lastCV: BigNumber
    let lastProfit: BigNumber
 
    return values
      .map((history) => {
        const profit = num(history.assetValue).minus(history.investedValue)
        const value = !lastCV
          ? ustBalance.plus(history.assetValue)
          : lastCV.minus(lastProfit).plus(profit)

        lastCV = value
        lastProfit = profit

        return { timestamp: history.timestamp, value: value.toFixed(0) }
      })
      .reverse()
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
      })

      const totalBalance = num(entity.balance).plus(amount)

      if (num(price).isGreaterThan(0)) {
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
    })

    return repo.save(entity)
  }
}

export function accountService(): AccountService {
  return Container.get(AccountService)
}
