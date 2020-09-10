import { Coin } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { program } from 'commander'
import { MintService } from 'services'
import * as logger from 'lib/logger'
import { getKey } from 'lib/keystore'
import { TxWallet } from 'lib/terra'
import config from 'config'

export function mint(): void {
  const mintService = Container.get(MintService)

  program
    .command('mint <symbol> <coin-amount>')
    .description('mint asset. eg) mint mAAPL 100uusd')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (symbol, coinAmount, { password }) => {
      const coin = Coin.fromString(coinAmount)
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))

      logger.info(await mintService.mint(symbol, coin, wallet))
    })
}
