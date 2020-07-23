import { Container } from 'typedi'
import { program } from 'commander'
import { MinterService } from 'services'
import * as logger from 'lib/logger'
import { getKey } from 'lib/keystore'
import config from 'config'

export function mint(): void {
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
    .command('config-mint')
    .description('modify configuration of mint contract')
    .option('-p, --password <owner-password>', 'owner key password')
    .option('--collateral-denom <denom>', 'collateral denom, uses mint')
    .option('--deposit-denom <denom>', 'deposit denom')
    .option('--whitelist-threshold <threshold>', 'whitelist threshold')
    .option('--auction-discount <discount-rate>', 'auction discount rate')
    .option('--auction-threshold-rate <threshold-rate>', 'auction start threshold rate')
    .option('--mint-capacity <capacity>', 'mint capacity rate')
    .option('--owner <owner>', 'owner')
    .action(
      async ({
        password,
        collateralDenom,
        depositDenom,
        whitelistThreshold,
        auctionDiscount,
        auctionThresholdRate,
        mintCapacity,
        owner,
      }) => {
        if (password) {
          await minterService.config(
            {
              collateralDenom,
              depositDenom,
              whitelistThreshold,
              auctionDiscount,
              auctionThresholdRate,
              mintCapacity,
              owner,
            },
            getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password)
          )
        }

        logger.info(await minterService.getConfig())
      }
    )

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
}
