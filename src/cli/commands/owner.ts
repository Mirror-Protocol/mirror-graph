import { program } from 'commander'
import { govService, assetService } from 'services'
import * as logger from 'lib/logger'
import { TxWallet } from 'lib/terra'
import { loadContracts, loadAssets, saveAssets, saveOracleAddress } from 'lib/data'
import { getKey } from 'lib/keystore'
import { Assets, AssetStatus, OracleAddress } from 'types'
import config from 'config'

export function ownerCommands(): void {
  program
    .command('create')
    .description('create gov from json')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .action(async ({ password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.KEYSTORE_OWNER_KEY, password))
      const contracts = loadContracts()
      const assets = loadAssets()

      const gov = await govService().create(wallet, contracts, assets)

      logger.info(`mirror contracts loaded. gov id: ${gov.id}`)
    })

  program
    .command('export-assets')
    .description('export assets.json')
    .action(async () => {
      const assetList = await assetService().getAll({
        where: [{ status: AssetStatus.LISTING }, { status: AssetStatus.MIGRATED }]
      })
      const assets: Assets = {}

      assetList.map((asset) => {
        const { symbol, name, token, pair, lpToken, status } = asset
        assets[asset.token] = { symbol, name, token, pair, lpToken, status }
      })

      saveAssets(assets)
    })

  program
    .command('export-oracle-address')
    .description('export address.json for oracle')
    .action(async () => {
      const contracts = loadContracts()
      const assetList = await assetService().getAll({
        where: { status: AssetStatus.LISTING }
      })

      const oracleInfo: OracleAddress = {
        oracle: contracts.oracle,
        assets: {}
      }

      assetList.map((asset) => {
        const { symbol, token } = asset
        oracleInfo.assets[symbol.substring(1)] = token
      })

      saveOracleAddress(oracleInfo)
    })
}
