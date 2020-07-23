import { program } from 'commander'
import { updateKey } from 'lib/keystore'
import config from 'config'

export function key(): void {
  program
    .command('update-owner-key')
    .description('update owner key')
    .action(async () => {
      await updateKey(config.KEYSTORE_PATH, config.OWNER_KEY)
    })

  program
    .command('update-oracle-key')
    .description('update oracle key')
    .action(async () => {
      await updateKey(config.KEYSTORE_PATH, config.ORACLE_KEY)
    })
}
