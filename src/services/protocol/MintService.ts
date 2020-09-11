import { Service, Inject } from 'typedi'
import { Coin, Coins, TxInfo } from '@terra-money/terra.js'
import { MintPosition, MintConfigGeneral, MintConfigAsset } from 'types'
import { AssetService } from 'services'
import { contractQuery, TxWallet } from 'lib/terra'

@Service()
export class MintService {
  constructor(@Inject((type) => AssetService) private readonly assetService: AssetService) {}

  async mint(symbol: string, coin: Coin, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol })
    return wallet.execute(asset.mint.address, { mint: {} }, new Coins([coin]))
  }

  async burn(symbol: string, amount: string, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol })
    return wallet.execute(asset.mint.address, { burn: { symbol, amount } })
  }

  // owner: minter
  async auction(symbol: string, amount: string, owner: string, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol })
    return wallet.execute(asset.mint.address, { auction: { amount, owner } })
  }

  async config(symbol: string, amount: string, owner: string, wallet: TxWallet): Promise<TxInfo> {
    const asset = await this.assetService.get({ symbol })
    return wallet.execute(asset.mint.address, { updateConfig: { amount, owner } })
  }

  async getPosition(symbol: string, address: string): Promise<MintPosition> {
    const asset = await this.assetService.get({ symbol })
    return contractQuery<MintPosition>(asset.mint.address, { position: { address } })
  }

  async getConfigGeneral(symbol: string): Promise<MintConfigGeneral> {
    const asset = await this.assetService.get({ symbol })
    return contractQuery<MintConfigGeneral>(asset.mint.address, { configGeneral: {} })
  }

  async getConfigAsset(symbol: string): Promise<MintConfigAsset> {
    const asset = await this.assetService.get({ symbol })
    return contractQuery<MintConfigAsset>(asset.mint.address, { configAsset: {} })
  }
}
