import * as bluebird from 'bluebird'
import { Service, Inject } from 'typedi'
import { contractQuery } from 'lib/terra'
import { lcd } from 'lib/terra'
import { num } from 'lib/num'
import { GovService, AssetService, ContractService } from 'services'
import { AssetBalance, ContractType } from 'types'

@Service()
export class AccountService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => ContractService) private readonly contractService: ContractService
  ) {}

  async getBalance(address: string, symbol: string): Promise<AssetBalance> {
    if (symbol === 'uusd') {
      const coin = (await lcd.bank.balance(address)).get(symbol)
      return { symbol, balance: coin.amount.toString() }
    }
    const tokenContract = await this.contractService.get({
      gov: this.govService.get(),
      type: ContractType.TOKEN,
    })
    const { balance } = await contractQuery(tokenContract.address, {
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
