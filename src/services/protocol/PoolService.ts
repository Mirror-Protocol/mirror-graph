import { Service, Inject } from 'typedi'
import { Coin, Coins, TxInfo, MsgExecuteContract } from '@terra-money/terra.js'
import { contractQuery, TxWallet } from 'lib/terra'
import { toSnakeCase } from 'lib/caseStyles'
import { AssetEntity } from 'orm'
import { Pool } from 'types'
import { AssetService } from 'services'
import config from 'config'

@Service()
export class PoolService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
  ) {}

  async provideLiquidity(
    wallet: TxWallet, asset: AssetEntity, assetAmount: string, collateralAmount: string
  ): Promise<TxInfo> {
    const assets = [
      { info: { token: { contractAddr: asset.address } }, amount: assetAmount },
      { info: { nativeToken: { denom: config.NATIVE_TOKEN_SYMBOL } }, amount: collateralAmount },
    ]

    // call increase_allowance of asset token contract
    const allowMsg = new MsgExecuteContract(
      wallet.key.accAddress,
      asset.address,
      toSnakeCase({ increaseAllowance: { amount: assetAmount, spender: asset.pair } }),
      new Coins([])
    )

    // call provide_liquidity of asset pair contract
    const provideMsg = new MsgExecuteContract(
      wallet.key.accAddress,
      asset.pair,
      toSnakeCase({ provideLiquidity: { assets } }),
      new Coins([new Coin(config.NATIVE_TOKEN_SYMBOL, collateralAmount)])
    )

    return wallet.executeMsgs([allowMsg, provideMsg])
  }

  async withdrawLiquidity(wallet: TxWallet, asset: AssetEntity, amount: string): Promise<TxInfo> {
    return wallet.execute(asset.lpToken, {
      send: {
        amount,
        contract: asset.pair,
        msg: Buffer.from('{"withdraw_liquidity":{}}').toString('base64'),
      },
    })
  }

  async getPool(asset: AssetEntity):
    Promise<{assetAmount: string; collateralAmount: string; totalShare: string}> {
    const pool = await contractQuery<Pool>(asset.pair, { pool: {} })
    const token = pool.assets.find((asset) => asset.info['token'])
    const nativeToken = pool.assets.find((asset) => asset.info['nativeToken'])

    return {
      assetAmount: token?.amount || '0',
      collateralAmount: nativeToken?.amount || '0',
      totalShare: pool.totalShare || '0'
    }
  }
}
