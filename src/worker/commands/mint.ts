import { Container } from 'typedi'
import { MnemonicKey } from '@terra-money/terra.js'
import { program } from 'commander'
import { OwnerService, AssetService } from 'services'

export function mint(): void {
  const ownerService = Container.get(OwnerService)
  const assetService = Container.get(AssetService)

  program
    .command('whitelisting <symbol> <name>')
    .description('whitelisting new asset')
    .requiredOption(
      '--mnemonic [aa,bb,cc,dd,...]',
      '24words mnemonic, must be separated by commas(,)',
      (value: string) => value.replace(/,/g, ' ')
    )
    .action(async (symbol, name, { mnemonic }) => {
      await assetService.whitelisting(symbol, name, new MnemonicKey({ mnemonic }))
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
    .requiredOption(
      '--mnemonic [aa,bb,cc,dd,...]',
      '24words mnemonic, must be separated by commas(,)',
      (value: string) => value.replace(/,/g, ' ')
    )
    .action(
      async (
        {
          collateralDenom,
          depositDenom,
          auctionDiscount,
          auctionThresholdRate,
          mintCapacity,
          owner,
        },
        { mnemonic }
      ) => {
        await ownerService.configMint(
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
