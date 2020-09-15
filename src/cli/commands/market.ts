import { Coin } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { program } from 'commander'
import { MarketService } from 'services'
import * as logger from 'lib/logger'
import { getKey } from 'lib/keystore'
import { TxWallet } from 'lib/terra'
import config from 'config'

export function market(): void {
  const marketService = Container.get(MarketService)

  program
    .command('provide-liquidity <asset-amount> <uusd-amount>')
    .description('provide liquidity. eg) provide-liquidity 100mAAPL 10000uusd')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (assetAmount, uusdAmount, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))

      logger.info(
        await marketService.provideLiquidity(
          Coin.fromString(assetAmount),
          Coin.fromString(uusdAmount),
          wallet
        )
      )
    })

  program
    .command('withdraw-liquidity <coin-amount>')
    .description('withdraw liquidity. eg) withdraw-liquidity 1000000mAAPL')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (coinAmount, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const coin = Coin.fromString(coinAmount)

      logger.info(await marketService.withdrawLiquidity(coin.denom, coin.amount.toString(), wallet))
    })
}
