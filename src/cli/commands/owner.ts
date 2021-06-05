import { program } from 'commander'
import { Not } from 'typeorm'
import { assetService } from 'services'
import { loadContracts, saveAssets, saveOracleAddress } from 'lib/data'
import { Assets, AssetStatus, OracleAddress } from 'types'

export function ownerCommands(): void {
  program
    .command('export-assets')
    .description('export assets.json')
    .action(async () => {
      const assetList = await assetService().getAll({
        where: [{ status: AssetStatus.LISTED }, { status: AssetStatus.DELISTED }, { status: AssetStatus.PRE_IPO }],
        order: { symbol: 'ASC' },
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
        where: { status: AssetStatus.LISTED, symbol: Not('MIR') },
        order: { symbol: 'ASC' },
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
