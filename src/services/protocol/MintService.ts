import { Service, Inject } from 'typedi'
import { Coin, Coins, TxInfo } from '@terra-money/terra.js'
import { contractQuery, TxWallet } from 'lib/terra'
import { MintPosition, MintConfigGeneral, MintConfigAsset, ContractType } from 'types'
import { AssetService, ContractService } from 'services'

@Service()
export class MintService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => ContractService) private readonly contractService: ContractService
  ) {}

  async mint(symbol: string, coin: Coin, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol })
    const mintContract = await this.contractService.get({ asset, type: ContractType.MINT })

    return wallet.execute(mintContract.address, { mint: {} }, new Coins([coin]))
  }

  async burn(symbol: string, amount: string, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol })
    const mintContract = await this.contractService.get({ asset, type: ContractType.MINT })

    return wallet.execute(mintContract.address, { burn: { symbol, amount } })
  }

  // owner: minter
  async auction(symbol: string, amount: string, owner: string, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol })
    const mintContract = await this.contractService.get({ asset, type: ContractType.MINT })

    return wallet.execute(mintContract.address, { auction: { amount, owner } })
  }

  async config(symbol: string, amount: string, owner: string, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol })
    const mintContract = await this.contractService.get({ asset, type: ContractType.MINT })

    return wallet.execute(mintContract.address, { updateConfig: { amount, owner } })
  }

  async getPosition(symbol: string, address: string): Promise<MintPosition> {
    const asset = await this.assetService.get({ symbol })
    const mintContract = await this.contractService.get({ asset, type: ContractType.MINT })

    return contractQuery<MintPosition>(mintContract.address, { position: { address } })
  }

  async getConfigGeneral(symbol: string): Promise<MintConfigGeneral> {
    const asset = await this.assetService.get({ symbol })
    const mintContract = await this.contractService.get({ asset, type: ContractType.MINT })

    return contractQuery<MintConfigGeneral>(mintContract.address, { configGeneral: {} })
  }

  async getConfigAsset(symbol: string): Promise<MintConfigAsset> {
    const asset = await this.assetService.get({ symbol })
    const mintContract = await this.contractService.get({ asset, type: ContractType.MINT })

    return contractQuery<MintConfigAsset>(mintContract.address, { configAsset: {} })
  }
}
