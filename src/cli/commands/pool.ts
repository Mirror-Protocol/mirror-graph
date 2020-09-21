import { Coin } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { program } from 'commander'
import { PoolService, AssetService } from 'services'
import * as logger from 'lib/logger'
import { getKey } from 'lib/keystore'
import { TxWallet } from 'lib/terra'
import config from 'config'

export function pool(): void {
  const poolService = Container.get(PoolService)
  const assetService = Container.get(AssetService)

  program
    .command('provide-liquidity <asset-amount> <collateral-amount>')
    .description('provide liquidity. eg) provide-liquidity 100mAAPL 10000uusd')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (assetAmount, collateralAmount, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const assetCoin = Coin.fromString(assetAmount)
      const collateralCoin = Coin.fromString(collateralAmount)
      if (collateralCoin.denom !== config.NATIVE_TOKEN_SYMBOL) {
        logger.error(`collateral must be ${config.NATIVE_TOKEN_SYMBOL}`)
        return
      }

      const asset = await assetService.get({ symbol: assetCoin.denom })
      const tx = await poolService.provideLiquidity(
        wallet, asset, assetCoin.amount.toString(), collateralCoin.amount.toString()
      )
      logger.info(tx)
    })

  program
    .command('withdraw-liquidity <coin-amount>')
    .description('withdraw liquidity. eg) withdraw-liquidity 1000000mAAPL')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (coinAmount, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const coin = Coin.fromString(coinAmount)
      const asset = await assetService.get({ symbol: coin.denom })

      const tx = await poolService.withdrawLiquidity(wallet, asset, coin.amount.toString())
      logger.info(tx)
    })

  program
    .command('pool-info <symbol>')
    .action(async (symbol) => {
      const asset = await assetService.get({ symbol })

      logger.info(await poolService.getPool(asset))
    })
}
