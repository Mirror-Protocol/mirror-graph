import * as bluebird from 'bluebird'
import { Service, Inject } from 'typedi'
import { contractQuery } from 'lib/terra'
import { lcd } from 'lib/terra'
import { num } from 'lib/num'
import { AssetService } from 'services'
import { AssetBalance, ContractType } from 'types'

@Service()
export class AccountService {
  constructor(@Inject((type) => AssetService) private readonly assetService: AssetService) {}

  async getBalance(address: string, symbol: string): Promise<AssetBalance> {
    if (symbol === 'uusd') {
      const coin = (await lcd.bank.balance(address)).get(symbol)
      return { symbol, balance: coin.amount.toString() }
    }
    const asset = await this.assetService.get({ symbol })
    const { balance } = await contractQuery(asset.getContract(ContractType.TOKEN).address, {
      balance: { address },
    })

    return { symbol, balance }
  }

  async getBalances(address: string): Promise<AssetBalance[]> {
    const terraBalances = (await lcd.bank.balance(address))
      .toArray()
      .map((coin) => ({ symbol: coin.denom, balance: coin.amount.toString() }))
    const mirrorBalances = await bluebird.map(this.assetService.getAll(), (asset) =>
      this.getBalance(address, asset.symbol)
    )
    return [...terraBalances, ...mirrorBalances].filter((balance) =>
      num(balance.balance).isGreaterThan(0)
    )
  }
}
