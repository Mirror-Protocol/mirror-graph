import * as bluebird from 'bluebird'
import { Repository, FindConditions, FindOneOptions } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service, Inject } from 'typedi'
import { lcd } from 'lib/terra'
import { num } from 'lib/num'
import { getTokenBalance } from 'lib/mirror'
import { AssetBalance } from 'graphql/schema'
import { AssetService } from 'services'
import { BalanceEntity } from 'orm'

@Service()
export class AccountService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @InjectRepository(BalanceEntity) private readonly balanceRepo: Repository<BalanceEntity>,
  ) {}

  async getBalance(address: string, token: string): Promise<string> {
    if (token === 'uusd') {
      const coin = (await lcd.bank.balance(address)).get(token)
      return coin.amount.toString()
    }

    return getTokenBalance(token, address)
  }

  async getBalances(address: string): Promise<AssetBalance[]> {
    const balances = await bluebird.map(
      this.assetService.getAll(), async (asset) => ({
        token: asset.token,
        balance: await this.getBalance(address, asset.token)
      })
    )
    balances.push({
      token: 'uusd',
      balance: await this.getBalance(address, 'uusd')
    })

    return balances.filter((balance) => num(balance.balance).isGreaterThan(0))
  }

  async getBalanceEntity(
    conditions: FindConditions<BalanceEntity>,
    options?: FindOneOptions<BalanceEntity>,
    repo = this.balanceRepo
  ): Promise<BalanceEntity> {
    return repo.findOne(conditions, options)
  }

  async addBalance(
    address: string, token: string, price: string, amount: string, repo = this.balanceRepo
  ): Promise<BalanceEntity> {
    const entity = await this.getBalanceEntity({ address, token }, undefined, repo)

    if (!entity) {
      return repo.save({ address, token, averagePrice: price, balance: amount })
    }

    const totalBalance = num(entity.balance).plus(amount)
    if (totalBalance.isLessThanOrEqualTo(0)) {
      await repo.remove(entity)
      return
    }

    // average = (last.avg_price*last.amount + current.avg_price*current.amount) / total_amount
    const value = num(price).multipliedBy(amount)
    const lastValue = num(entity.averagePrice).multipliedBy(entity.balance)

    entity.averagePrice = value.plus(lastValue).dividedBy(totalBalance).toString()
    entity.balance = totalBalance.toString()

    return repo.save(entity)
  }
}

export function accountService(): AccountService {
  return Container.get(AccountService)
}
