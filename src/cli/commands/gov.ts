import * as fs from 'fs'
import { Container } from 'typedi'
import { program } from 'commander'
import { GovService, AssetService } from 'services'
import { getKey } from 'lib/keystore'
import * as logger from 'lib/logger'
import { TxWallet } from 'lib/terra'
import config from 'config'

async function writeOracleAddresses(): Promise<void> {
  const assetService = Container.get(AssetService)
  const assets = await assetService.getAll()
  const address = {}
  for (const asset of assets) {
    if (asset.symbol === config.MIRROR_TOKEN_SYMBOL) {
      continue
    }
    address[asset.symbol.substring(1)] = asset.oracle
  }
  fs.writeFileSync('./address.json', JSON.stringify(address))
  logger.info(address)
}

export function whitelisting(): void {
  const govService = Container.get(GovService)

  program
    .command('whitelisting <symbol> <name>')
    .description('whitelisting new asset')
    .requiredOption('--owner <owner-password>', 'owner key password')
    .action(async (symbol, name, { owner }) => {
      await govService.whitelisting(
        symbol,
        name,
        new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner))
      )
      await writeOracleAddresses()
    })

  program
    .command('oracle-address')
    .description('save oracle address json file to path')
    .action(async () => {
      await writeOracleAddresses()
    })
}
