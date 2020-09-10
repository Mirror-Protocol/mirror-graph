import * as Bluebird from 'bluebird'
// import { concat } from 'lodash'
import { Service, Inject } from 'typedi'
import { contractQuery } from 'lib/terra'
// import { lcd } from 'lib/terra'
import { AssetService } from 'services'
import { AssetBalance } from 'types'

@Service()
export class AccountService {
  constructor(@Inject((type) => AssetService) private readonly assetService: AssetService) {}

  async getBalance(symbol: string, address: string): Promise<AssetBalance> {
    const asset = await this.assetService.get({ symbol })
    const { balance } = await contractQuery(asset.token, { balance: { address } })

    return { symbol, balance }
  }

  async getBalances(address: string): Promise<AssetBalance[]> {
    // // terra balances
    // const coins = await lcd.bank.balance(address)
    // for (const coin of coins.toArray()) {
    //   balances[coin.denom] = coin.amount.toString()
    // }
    return Bluebird.map(this.assetService.getAll(), (asset) =>
      this.getBalance(asset.symbol, address)
    )
  }
}
