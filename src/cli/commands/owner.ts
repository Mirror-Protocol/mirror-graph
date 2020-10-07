import { program } from 'commander'
import { govService, assetService } from 'services'
import * as logger from 'lib/logger'
import { TxWallet } from 'lib/terra'
import { getKey } from 'lib/keystore'
import { Assets } from 'types'
import config from 'config'
import { loadCodeIds, loadContracts, loadAssets, saveAssets } from './data'

export function ownerCommands(): void {
  program
    .command('create')
    .description('create gov from json')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .action(async ({ password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password))
      const codeIds = loadCodeIds()
      const contracts = loadContracts()
      const assets = loadAssets()

      const gov = await govService().create(wallet, codeIds, contracts, assets)

      logger.info(`mirror contracts loaded. gov id: ${gov.id}`)
    })

  program
    .command('update-code-ids')
    .description('update codeIds from json')
    .action(async () => {
      const codeIds = loadCodeIds()

      const gov = govService().get()
      gov.codeIds = codeIds

      await govService().update(gov)

      logger.info(`codeIds updated. gov id: ${gov.id}`)
    })

  program
    .command('export-assets')
    .description('export assets.json')
    .action(async () => {
      const assetList = await assetService().getAll({ where: { isListed: true }})
      const assets: Assets = {}

      assetList.map((asset) => {
        const { symbol, name, token, pair, lpToken } = asset
        assets[asset.token] = { symbol, name, token, pair, lpToken }
      })

      saveAssets(assets)
    })
}
