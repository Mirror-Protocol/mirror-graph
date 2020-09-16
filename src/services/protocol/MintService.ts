import { Service, Inject } from 'typedi'
import { Coin, Coins, TxInfo, MsgExecuteContract } from '@terra-money/terra.js'
import { contractQuery, TxWallet } from 'lib/terra'
import { toSnakeCase } from 'lib/caseStyles'
import { AssetEntity } from 'orm'
import { MintConfigGeneral, MintConfigAsset, ContractType } from 'types'
import { ContractService } from 'services'

@Service()
export class MintService {
  constructor(
    @Inject((type) => ContractService) private readonly contractService: ContractService
  ) {}

  async mint(asset: AssetEntity, coin: Coin, wallet: TxWallet): Promise<TxInfo> {
    const mintContract = await this.contractService.get({ asset, type: ContractType.MINT })

    return wallet.execute(mintContract.address, { mint: {} }, new Coins([coin]))
  }

  async burn(asset: AssetEntity, amount: string, wallet: TxWallet): Promise<TxInfo> {
    const mintContract = await this.contractService.get({ asset, type: ContractType.MINT })
    const tokenContract = await this.contractService.get({ asset, type: ContractType.TOKEN })

    const allowMsg = toSnakeCase({ increaseAllowance: { amount, spender: mintContract.address } })
    const burnMsg = toSnakeCase({ burn: { amount } })

    return wallet.executeMsgs([
      new MsgExecuteContract(wallet.key.accAddress, tokenContract.address, allowMsg, new Coins([])),
      new MsgExecuteContract(wallet.key.accAddress, mintContract.address, burnMsg, new Coins([])),
    ])
  }

  // owner: minter
  async auction(
    asset: AssetEntity,
    amount: string,
    owner: string,
    wallet: TxWallet
  ): Promise<TxInfo> {
    const mintContract = await this.contractService.get({ asset, type: ContractType.MINT })

    return wallet.execute(mintContract.address, { auction: { amount, owner } })
  }

  async config(
    asset: AssetEntity,
    amount: string,
    owner: string,
    wallet: TxWallet
  ): Promise<TxInfo> {
    const mintContract = await this.contractService.get({ asset, type: ContractType.MINT })

    return wallet.execute(mintContract.address, { updateConfig: { amount, owner } })
  }

  async getConfigGeneral(asset: AssetEntity): Promise<MintConfigGeneral> {
    const mintContract = await this.contractService.get({ asset, type: ContractType.MINT })

    return contractQuery<MintConfigGeneral>(mintContract.address, { configGeneral: {} })
  }

  async getConfigAsset(asset: AssetEntity): Promise<MintConfigAsset> {
    const mintContract = await this.contractService.get({ asset, type: ContractType.MINT })

    return contractQuery<MintConfigAsset>(mintContract.address, { configAsset: {} })
  }
}
