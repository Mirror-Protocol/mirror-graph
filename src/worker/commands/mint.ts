import { Container } from 'typedi'
import { MnemonicKey } from '@terra-money/terra.js'
import { program } from 'commander'
import { MinterService } from 'services'

export function mint(): void {
  const minterService = Container.get(MinterService)

  program
    .command('whitelist <symbol> <name>')
    .description('whitelisting new asset')
    .requiredOption('-m, --mnemonic <"mnemonic">', '24words mnemonic, must be separated by space')
    .action(async (symbol, name, { mnemonic }) => {
      await minterService.whitelist(symbol, name, new MnemonicKey({ mnemonic }))
    })

  program
    .command('config-mint')
    .description('modify configuration of mint contract')
    .option('--collateral-denom <denom>', 'collateral denom')
    .option('--deposit-denom <denom>', 'deposit denom')
    .option('--auction-discount <discount-rate>', 'auction discount rate')
    .option('--auction-threshold-rate <threshold-rate>', 'auction start threshold rate')
    .option('--mint-capacity <capacity>', 'mint capacity rate')
    .option('--owner <owner>', 'owner')
    .requiredOption('-m, --mnemonic <"mnemonic">', '24words mnemonic, must be separated by space')
    .action(
      async ({
        collateralDenom,
        depositDenom,
        auctionDiscount,
        auctionThresholdRate,
        mintCapacity,
        owner,
        mnemonic,
      }) => {
        await minterService.config(
          {
            collateralDenom,
            depositDenom,
            auctionDiscount,
            auctionThresholdRate,
            mintCapacity,
            owner,
          },
          new MnemonicKey({ mnemonic })
        )
      }
    )
}
