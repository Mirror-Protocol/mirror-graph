import { program } from 'commander'
import { updateKey } from 'lib/keystore'
import config from 'config'

export function key(): void {
  program
    .command('update-owner-key')
    .description('update owner key')
    .action(async () => updateKey(config.KEYSTORE_PATH, config.OWNER_KEY))

  program
    .command('update-bot-key')
    .description('bot key')
    .action(async () => updateKey(config.KEYSTORE_PATH, config.BOT_KEY))
}
