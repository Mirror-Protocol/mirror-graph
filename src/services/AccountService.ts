import * as Bluebird from 'bluebird'
import { Service, Inject } from 'typedi'
import { contractQuery } from 'lib/terra'
import { lcd } from 'lib/terra'
import { num } from 'lib/num'
import { AssetService } from 'services'
import { AssetBalance } from 'types'

@Service()
export class AccountService {
  constructor(@Inject((type) => AssetService) private readonly assetService: AssetService) {}

  async getBalance(address: string, symbol: string): Promise<AssetBalance> {
    const asset = await this.assetService.get({ symbol })
    const { balance } = await contractQuery(asset.token, { balance: { address } })

    return { symbol, balance }
  }

  async getBalances(address: string): Promise<AssetBalance[]> {
    const terraBalances = (await lcd.bank.balance(address))
      .toArray()
      .map((coin) => ({ symbol: coin.denom, balance: coin.amount.toString() }))
    const mirrorBalances = await Bluebird.map(this.assetService.getAll(), (asset) =>
      this.getBalance(address, asset.symbol)
    )
    return [...terraBalances, ...mirrorBalances].filter((balance) =>
      num(balance.balance).isGreaterThan(0)
    )
  }
}
