import { Container } from 'typedi'
import { program } from 'commander'
import { GovService } from 'services'
import * as logger from 'lib/logger'
import { TxWallet } from 'lib/terra'
import { getKey } from 'lib/keystore'
import config from 'config'
import { loadCodeIds, loadContracts, loadAssets } from './data'

export function ownerCommands(): void {
  const govService = Container.get(GovService)

  program
    .command('create')
    .description('create gov from json')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .action(async ({ password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password))
      const codeIds = loadCodeIds()
      const contracts = loadContracts()
      const assets = loadAssets()

      const gov = await govService.create(wallet, codeIds, contracts, assets)

      logger.info(`mirror contracts loaded. gov id: ${gov.id}`)
    })
}
