import * as bluebird from 'bluebird'
import { Service, Inject } from 'typedi'
import { lcd } from 'lib/terra'
import { num } from 'lib/num'
import { getTokenBalance } from 'lib/mirror'
import { AssetBalance } from 'graphql/schema'
import { AssetService } from 'services'

@Service()
export class AccountService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
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
}
