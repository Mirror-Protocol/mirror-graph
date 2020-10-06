import * as bluebird from 'bluebird'
import { Service, Inject } from 'typedi'
import { contractQuery } from 'lib/terra'
import { lcd } from 'lib/terra'
import { num } from 'lib/num'
import { AssetEntity } from 'orm'
import { AssetBalance } from 'graphql/schema'
import { AssetService } from 'services'

@Service()
export class AccountService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
  ) {}

  async getBalance(address: string, token: string): Promise<AssetBalance> {
    if (token === 'uusd') {
      return this.getTerraBalance(address, token)
    }

    return this.getAssetBalance(address, await this.assetService.get({ token }))
  }

  async getTerraBalance(address: string, symbol: string): Promise<AssetBalance> {
    const coin = (await lcd.bank.balance(address)).get(symbol)
    return { symbol, balance: coin.amount.toString() }
  }

  async getAssetBalance(address: string, asset: AssetEntity): Promise<AssetBalance> {
    const { balance } = await contractQuery(asset.token, { balance: { address } })

    return { symbol: asset.symbol, balance }
  }

  async getBalances(address: string): Promise<AssetBalance[]> {
    const balances = await bluebird.map(
      this.assetService.getAll(), (asset) => this.getAssetBalance(address, asset)
    )
    balances.push(await this.getTerraBalance(address, 'uusd'))

    return balances.filter((balance) => num(balance.balance).isGreaterThan(0))
  }
}
