import { Coin } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { program } from 'commander'
import { getKey } from 'lib/keystore'
import * as logger from 'lib/logger'
import { TxWallet } from 'lib/terra'
import { AssetService, AccountService, TradeService } from 'services'
import config from 'config'

export function trade(): void {
  const assetService = Container.get(AssetService)
  const accountService = Container.get(AccountService)
  const tradeService = Container.get(TradeService)

  program.command('simul <symbol> <coin>').action(async (symbol, coinString) => {
    const coin = Coin.fromString(coinString)
    const asset = await assetService.get({ symbol })

    const simulated = await tradeService.simulation(asset, coin)
    logger.info(simulated)
  })

  program.command('reverse-simul <symbol> <coin>').action(async (symbol, coinString) => {
    const coin = Coin.fromString(coinString)
    const asset = await assetService.get({ symbol })

    const simulated = await tradeService.simulation(asset, coin)
    logger.info(simulated)
  })

  program
    .command('buy <symbol> <offer-amount>')
    .requiredOption('--owner <owner-password>', 'owner key password')
    .action(async (symbol, offerAmount, { owner }) => {
      const asset = await assetService.get({ symbol })
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner))
      const offerCoin = Coin.fromString(offerAmount)

      const tx = await tradeService.buy(wallet, asset, offerCoin)
      logger.info(tx)
      logger.info(await accountService.getBalances(wallet.key.accAddress))
    })

  program
    .command('sell <coin>')
    .requiredOption('--owner <owner-password>', 'owner key password')
    .action(async (coin, { owner }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner))
      const sellCoin = Coin.fromString(coin)
      const asset = await assetService.get({ symbol: sellCoin.denom })

      const tx = await tradeService.sell(wallet, asset, sellCoin.amount.toString())
      logger.info(tx)
      logger.info(await accountService.getBalances(wallet.key.accAddress))
    })

  program
    .command('balance')
    .requiredOption('--owner <owner-password>', 'owner key password')
    .action(async ({ owner }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner))
      logger.info(await accountService.getBalances(wallet.key.accAddress))
    })
}
