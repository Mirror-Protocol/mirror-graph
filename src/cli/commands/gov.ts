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
    .requiredOption('--oracle <oracle-password>', 'oracle key password')
    .action(async (symbol, name, { owner, oracle }) => {
      await govService.whitelisting(
        new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner)),
          new TxWallet(getKey(config.KEYSTORE_PATH, config.ORACLE_KEY, oracle)),
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
