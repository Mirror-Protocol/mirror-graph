import { Container } from 'typedi'
import { MnemonicKey } from '@terra-money/terra.js'
import { program } from 'commander'
import { OwnerService } from 'services'
import * as logger from 'lib/logger'

export function contract(): void {
  const ownerService = Container.get(OwnerService)

  program
    .command('store-codes')
    .description('store mint/oracle/token/market contracts to chain')
    .requiredOption(
      '--mnemonic [aa,bb,cc,dd,...]',
      '24words mnemonic, must be separated by commas(,)',
      (value: string) => value.replace(/,/g, ' ')
    )
    .action(async ({ mnemonic }) => {
      await ownerService.storeCodes(new MnemonicKey({ mnemonic }))
    })

  program
    .command('create')
    .description('instantiate mint/market contracts')
    .requiredOption(
      '--mnemonic [aa,bb,cc,dd,...]',
      '24words mnemonic, must be separated by commas(,)',
      (value: string) => value.replace(/,/g, ' ')
    )
    .action(async ({ mnemonic }) => {
      logger.info(await ownerService.create(new MnemonicKey({ mnemonic })))
    })

  program
    .command('contract-info')
    .description('show mint/market contracts infomation')
    .action(async () => {
      await ownerService.printContractInfo()
    })
}
