import { Container } from 'typedi'
import { program } from 'commander'
import { MinterService } from 'services'
import * as logger from 'lib/logger'
import { getKey } from 'lib/keystore'
import config from 'config'

export function minter(): void {
  const minterService = Container.get(MinterService)

  program
    .command('whitelisting <symbol> <name>')
    .description('whitelisting new asset')
    .requiredOption('--owner <owner-password>', 'owner key password')
    .requiredOption('--oracle <oracle-password>', 'oracle key password')
    .action(async (symbol, name, { owner, oracle }) => {
      await minterService.whitelisting(
        symbol,
        name,
        getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner),
        getKey(config.KEYSTORE_PATH, config.ORACLE_KEY, oracle)
      )
    })

  program
    .command('deposit <symbol> <amount>')
    .description('deposit to symbol. eg) deposit mAAPL 100uluna')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .action(async (symbol, amount, { password }) => {
      await minterService.deposit(
        symbol,
        getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password),
        amount
      )
    })

  program
    .command('mint <symbol> <amount>')
    .description('mint asset. eg) mint mAAPL 100uusd')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .action(async (symbol, amount, { password }) => {
      await minterService.mint(
        symbol,
        getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password),
        amount
      )
    })

  program
    .command('print-whitelist <symbol>')
    .description('print whitelisted information')
    .action(async (symbol) => {
      logger.info(await minterService.getWhitelist(symbol))
    })

  program
    .command('print-position <symbol>')
    .description('print deposit/position')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .action(async (symbol, { password }) => {
      const key = getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password)
      logger.info(await minterService.getDeposit(symbol, key.accAddress))
      logger.info(await minterService.getPosition(symbol, key.accAddress))
    })
}
