import { Coin } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { program } from 'commander'
import { MintService, AssetService } from 'services'
import * as logger from 'lib/logger'
import { getKey } from 'lib/keystore'
import { TxWallet } from 'lib/terra'
import config from 'config'

export function mint(): void {
  const mintService = Container.get(MintService)
  const assetService = Container.get(AssetService)

  program
    .command('mint <symbol> <coin-amount>')
    .description('mint asset. eg) mint mAAPL 100uusd')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (symbol, coinAmount, { password }) => {
      const coin = Coin.fromString(coinAmount)
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const asset = await assetService.get({ symbol })

      logger.info(await mintService.mint(asset, coin, wallet))
    })

  program
    .command('burn <coin-amount>')
    .description('burn asset. eg) burn 1000mAAPL')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (coinAmount, { password }) => {
      const coin = Coin.fromString(coinAmount)
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const asset = await assetService.get({ symbol: coin.denom })

      logger.info(await mintService.burn(asset, coin.amount.toString(), wallet))
    })
}
