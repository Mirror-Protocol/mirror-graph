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
}
