import { Container } from 'typedi'
import { program } from 'commander'
import { getKey } from 'lib/keystore'
import { TxWallet } from 'lib/terra'
import { GovService } from 'services'
import config from 'config'
import { writeOracleAddresses } from './utils'

export function whitelisting(): void {
  const govService = Container.get(GovService)

  program
    .command('whitelisting <symbol> <name>')
    .description('whitelisting new asset')
    .requiredOption('--owner <owner-password>', 'owner key password')
    .action(async (symbol, name, { owner }) => {
      await govService.whitelisting(
        new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner)),
        symbol,
        name,
      )
    })

  program
    .command('oracle-address')
    .description('save oracle address json file to path')
    .action(async () => {
      await writeOracleAddresses()
    })
}
