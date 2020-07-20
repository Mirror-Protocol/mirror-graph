import { Container } from 'typedi'
import { MnemonicKey } from '@terra-money/terra.js'
import { program } from 'commander'
import { MinterService } from 'services'
import * as logger from 'lib/logger'

export function mint(): void {
  const minterService = Container.get(MinterService)

  program
    .command('whitelisting <symbol> <name>')
    .description('whitelisting new asset')
    .requiredOption('-m, --mnemonic <"mnemonic">', '24words mnemonic, must be separated by space')
    .action(async (symbol, name, { mnemonic }) => {
      await minterService.whitelisting(symbol, name, new MnemonicKey({ mnemonic }))
    })

  program
    .command('config-mint')
    .description('modify configuration of mint contract')
    .option('--collateral-denom <denom>', 'collateral denom, uses mint')
    .option('--deposit-denom <denom>', 'deposit denom')
    .option('--whitelist-threshold <threshold>', 'whitelist threshold')
    .option('--auction-discount <discount-rate>', 'auction discount rate')
    .option('--auction-threshold-rate <threshold-rate>', 'auction start threshold rate')
    .option('--mint-capacity <capacity>', 'mint capacity rate')
    .option('--owner <owner>', 'owner')
    .option('-m, --mnemonic <"mnemonic">', '24words mnemonic, must be separated by space')
    .action(
      async ({
        collateralDenom,
        depositDenom,
        whitelistThreshold,
        auctionDiscount,
        auctionThresholdRate,
        mintCapacity,
        owner,
        mnemonic,
      }) => {
        if (mnemonic) {
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
            new MnemonicKey({ mnemonic })
          )
        }

        logger.info(await minterService.getConfig())
      }
    )

  program
    .command('deposit <symbol> <amount>')
    .description('deposit to symbol. eg) deposit mAAPL 100uluna')
    .requiredOption('-m, --mnemonic <"mnemonic">', '24words mnemonic, must be separated by space')
    .action(async (symbol, amount, { mnemonic }) => {
      await minterService.deposit(symbol, new MnemonicKey({ mnemonic }), amount)
    })

  program
    .command('mint <symbol> <amount>')
    .description('mint asset. eg) mint mAAPL 100uusd')
    .requiredOption('-m, --mnemonic <"mnemonic">', '24words mnemonic, must be separated by space')
    .action(async (symbol, amount, { mnemonic }) => {
      await minterService.mint(symbol, new MnemonicKey({ mnemonic }), amount)
    })

  program
    .command('print-whitelist <symbol>')
    .description('print whitelisted information')
    .action(async (symbol) => {
      logger.info(await minterService.getWhitelist(symbol))
    })
}
