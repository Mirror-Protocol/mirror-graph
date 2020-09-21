import { Service, Inject } from 'typedi'
import { Coin, Coins, TxInfo } from '@terra-money/terra.js'
import { TxWallet } from 'lib/terra'
import { AssetEntity } from 'orm'
import { GovService, AssetService } from 'services'
import config from 'config'

@Service()
export class MintService {
  constructor(
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => AssetService) private readonly assetService: AssetService,
  ) {}

  async getCollateralInfo(coin: Coin): Promise<unknown> {
    if (coin.denom === config.NATIVE_TOKEN_SYMBOL) {
      return {
        info: { nativeToken: { denom: coin.denom } },
        amount: coin.amount.toString()
      }
    }

    const asset = await this.assetService.get({ symbol: coin.denom })
    return {
      info: { token: { contractAddr: asset.address } },
      amount: coin.amount.toString()
    }
  }

  async openPosition(
    wallet: TxWallet, symbol: string, collateralCoin: Coin, collateralRatio: string
  ): Promise<TxInfo> {
    const gov = this.govService.get()
    const asset = await this.assetService.get({ symbol })
    const assetInfo = { token: { contractAddr: asset.address } }
    const collateral = await this.getCollateralInfo(collateralCoin)
    const sendCoins = collateralCoin.denom === config.NATIVE_TOKEN_SYMBOL && new Coins([collateralCoin])

    return wallet.execute(
      gov.mint, { openPosition: { assetInfo, collateral, collateralRatio } }, sendCoins
    )
  }

  async deposit(wallet: TxWallet, positionIdx: number, collateralCoin: Coin): Promise<TxInfo> {
    const gov = this.govService.get()
    const sendCoins = collateralCoin.denom === config.NATIVE_TOKEN_SYMBOL && new Coins([collateralCoin])
    const collateral = await this.getCollateralInfo(collateralCoin)

    return wallet.execute(
      gov.mint, { deposit: { positionIdx, collateral } }, sendCoins
    )
  }

  async withdraw(wallet: TxWallet, positionIdx: number, collateralCoin: Coin): Promise<TxInfo> {
    const gov = this.govService.get()
    const collateral = await this.getCollateralInfo(collateralCoin)

    return wallet.execute(
      gov.mint, { withdraw: { positionIdx, collateral } }
    )
  }

  async mint(wallet: TxWallet, asset: AssetEntity, positionIdx: number, amount: string): Promise<TxInfo> {
    const gov = this.govService.get()
    const assetInfo = { info: { token: { contractAddr: asset.address } }, amount }

    return wallet.execute(gov.mint, { mint: { positionIdx, asset: assetInfo } })
  }

  async burn(wallet: TxWallet, asset: AssetEntity, positionIdx: number, amount: string): Promise<TxInfo> {
    const gov = this.govService.get()
    const burnMsg = `{"burn":{"position_idx":${positionIdx}}}`

    return wallet.execute(asset.address, {
      send: { amount, contract: gov.mint, msg: Buffer.from(burnMsg).toString('base64') }
    })
  }
}
