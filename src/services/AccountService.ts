import * as bluebird from 'bluebird'
import { Service, Inject } from 'typedi'
import { contractQuery } from 'lib/terra'
import { lcd } from 'lib/terra'
import { num } from 'lib/num'
import { AssetEntity } from 'orm'
import { AssetBalance, ContractType } from 'types'
import { AssetService, ContractService } from 'services'

@Service()
export class AccountService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => ContractService) private readonly contractService: ContractService
  ) {}

  async getBalance(address: string, symbol: string): Promise<AssetBalance> {
    if (symbol === 'uusd') {
      return this.getTerraBalance(address, symbol)
    } else if (symbol.substr(-3, 3) === '-LP') {
      return this.getLPBalance(address, await this.assetService.get({ lpTokenSymbol: symbol }))
    }

    return this.getAssetBalance(address, await this.assetService.get({ symbol }))
  }

  async getTerraBalance(address: string, symbol: string): Promise<AssetBalance> {
    const coin = (await lcd.bank.balance(address)).get(symbol)
    return { symbol, balance: coin.amount.toString() }
  }

  async getAssetBalance(address: string, asset: AssetEntity): Promise<AssetBalance> {
    const tokenContract = await this.contractService.get({ asset, type: ContractType.TOKEN })
    const { balance } = await contractQuery(tokenContract.address, { balance: { address } })

    return { symbol: asset.symbol, balance }
  }

  async getLPBalance(address: string, asset: AssetEntity): Promise<AssetBalance> {
    const tokenContract = await this.contractService.get({ asset, type: ContractType.LP_TOKEN })
    const { balance } = await contractQuery(tokenContract.address, { balance: { address } })

    return { symbol: asset.lpTokenSymbol, balance }
  }

  async getBalances(address: string): Promise<AssetBalance[]> {
    const terraBalances = (await lcd.bank.balance(address))
      .toArray()
      .map((coin) => ({ symbol: coin.denom, balance: coin.amount.toString() }))
    const mirrorBalances = await bluebird.map(
      this.assetService.getAll(), (asset) => this.getAssetBalance(address, asset)
    )
    // const lpBalances = await bluebird.map(
    //   this.assetService.getAll(), (asset) => this.getBalance(address, asset.symbol)
    // )
    return [...terraBalances, ...mirrorBalances].filter((balance) =>
      num(balance.balance).isGreaterThan(0)
    )
  }
}
