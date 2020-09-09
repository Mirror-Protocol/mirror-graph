import { Coin } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { program } from 'commander'
import { MarketService } from 'services'
import * as logger from 'lib/logger'
import { getKey } from 'lib/keystore'
import { lcd } from 'lib/terra'
import config from 'config'

export function market(): void {
  const marketService = Container.get(MarketService)

  program
    .command('provide-liquidity <asset-amount> <uusd-amount>')
    .description('provide liquidity. eg) provide-liquidity 100mAAPL 10000uusd')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (assetAmount, uusdAmount, { password }) => {
      const wallet = lcd.wallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))

      logger.info(
        await marketService.provideLiquidity(
          Coin.fromString(assetAmount),
          Coin.fromString(uusdAmount),
          wallet
        )
      )
    })

  program
    .command('withdraw-liquidity <symbol> <amount>')
    .description('withdraw liquidity. eg) withdraw-liquidity mAAPL 10')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (symbol, amount, { password }) => {
      const wallet = lcd.wallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))

      await marketService.withdrawLiquidity(symbol, amount, wallet)
    })
}
