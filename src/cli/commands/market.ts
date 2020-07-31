import * as fs from 'fs'
import { Container } from 'typedi'
import { program } from 'commander'
import { AssetService } from 'services'
import * as logger from 'lib/logger'

export function market(): void {
  const assetService = Container.get(AssetService)

  program
    .command('price <symbol>')
    .description('print whitelisted information')
    .action(async (symbol) => {
      logger.info(await assetService.getPrice(symbol))
    })

  program
    .command('oracle-address <path>')
    .description('save oracle address json file to path')
    .action(async (path) => {
      const assets = await assetService.getAll()
      const address = {}
      for (const asset of assets) {
        address[asset.symbol.substring(1)] = asset.oracle
      }
      fs.writeFileSync(path, JSON.stringify(address))
      logger.info(address)
    })
}
