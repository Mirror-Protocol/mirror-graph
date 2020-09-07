import { Coin } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { program } from 'commander'
import { LPService, GovService } from 'services'
import * as logger from 'lib/logger'
import { getKey } from 'lib/keystore'
import config from 'config'

export function whitelisting(): void {
  const govService = Container.get(GovService)

  program
    .command('whitelisting <symbol> <name>')
    .description('whitelisting new asset')
    .requiredOption('--owner <owner-password>', 'owner key password')
    .requiredOption('--oracle <oracle-password>', 'oracle key password')
    .action(async (symbol, name, { owner, oracle }) => {
      await govService.whitelisting(
        symbol,
        name,
        getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner),
        getKey(config.KEYSTORE_PATH, config.ORACLE_KEY, oracle)
      )
    })

  program
    .command('deposit <symbol> <coin-amount>')
    .description('deposit to symbol. eg) deposit mAAPL 100uluna')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .action(async (symbol, coinAmount, { password }) => {
      const coin = Coin.fromString(coinAmount)
      const key = getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password)

      await govService.deposit(symbol, coin, key)
    })

  program
    .command('print-whitelist <symbol>')
    .description('print whitelisted information')
    .action(async (symbol) => {
      logger.info(await govService.getWhitelist(symbol))
    })

  program
    .command('print-deposit <symbol>')
    .description('print deposit information')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .action(async (symbol, { password }) => {
      const key = getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password)
      logger.info(await govService.getDepositAmount(symbol, key.accAddress))
    })
}

export function lp(): void {
  const lpService = Container.get(LPService)

  program
    .command('mint <symbol> <coin-amount>')
    .description('mint asset. eg) mint mAAPL 100uusd')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (symbol, coinAmount, { password }) => {
      const coin = Coin.fromString(coinAmount)
      const key = getKey(config.KEYSTORE_PATH, config.LP_KEY, password)

      await lpService.mint(symbol, coin, key)
    })

  program
    .command('provide-liquidity <coin-amount>')
    .description('provide liquidity. eg) provide-liquidity 1000uusd')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (coinAmount, { password }) => {
      const coin = Coin.fromString(coinAmount)
      const key = getKey(config.KEYSTORE_PATH, config.LP_KEY, password)

      await lpService.provideLiquidity(coin, key)
    })

  program
    .command('withdraw-liquidity <coin-amount>')
    .description('withdraw liquidity. eg) withdraw-liquidity 1000uusd')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (coinAmount, { password }) => {
      const coin = Coin.fromString(coinAmount)
      const key = getKey(config.KEYSTORE_PATH, config.LP_KEY, password)

      await lpService.withdrawLiquidity(coin, key)
    })

  program
    .command('print-mint-position <symbol>')
    .description('print position')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (symbol, { password }) => {
      const key = getKey(config.KEYSTORE_PATH, config.LP_KEY, password)

      logger.info(await lpService.getMintPosition(symbol, key.accAddress))
    })
}
