import { Service, Inject } from 'typedi'
import { Coin, Coins, TxInfo } from '@terra-money/terra.js'
import { contractQuery, TxWallet } from 'lib/terra'
import { AssetEntity } from 'orm'
import { AssetService } from 'services'
import config from 'config'

@Service()
export class TradeService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
  ) {}

  async getAssetInfo(coin: Coin): Promise<unknown> {
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

  async buy(wallet: TxWallet, asset: AssetEntity, offerCoin: Coin): Promise<TxInfo> {
    const sendCoins = offerCoin.denom === config.NATIVE_TOKEN_SYMBOL && new Coins([offerCoin])
    return wallet.execute(asset.pair, {
      swap: { offerAsset: await this.getAssetInfo(offerCoin) }
    }, sendCoins)
  }

  async simulation(asset: AssetEntity, offerCoin: Coin): Promise<unknown> {
    return contractQuery(asset.pair, {
      simulation: { offerAsset: await this.getAssetInfo(offerCoin) },
    })
  }

  async reverseSimulation(asset: AssetEntity, askCoin: Coin): Promise<unknown> {
    return contractQuery(asset.pair, {
      reverseSimulation: { askAsset: await this.getAssetInfo(askCoin) },
    })
  }

  async sell(wallet: TxWallet, asset: AssetEntity, amount: string): Promise<TxInfo> {
    return wallet.execute(asset.address, {
      send: {
        amount,
        contract: asset.pair,
        msg: Buffer.from('{"swap":{"max_spread":"0.1"}}').toString('base64'),
      },
    })
  }
}
