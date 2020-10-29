import { program } from 'commander'
import { govService, assetService } from 'services'
import * as logger from 'lib/logger'
import { TxWallet } from 'lib/terra'
import { getKey } from 'lib/keystore'
import { Assets } from 'types'
import config from 'config'
import { loadContracts, loadAssets, saveAssets } from 'lib/data'
import { fetchNews } from 'lib/iex'

export function ownerCommands(): void {
  program
    .command('create')
    .description('create gov from json')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .action(async ({ password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password))
      const contracts = loadContracts()
      const assets = loadAssets()

      const gov = await govService().create(wallet, contracts, assets)

      logger.info(`mirror contracts loaded. gov id: ${gov.id}`)
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

  program
    .command('news')
    .action(async () => {
      const assetList = await assetService().getAll({ where: { isListed: true }})
      assetList.map(async (asset) => {
        const { symbol } = asset
        await fetchNews(symbol.substring(1), 2000)
      })
    })
}
