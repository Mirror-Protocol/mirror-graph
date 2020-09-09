import * as fs from 'fs'
import { Container } from 'typedi'
import { program } from 'commander'
import { GovService, AssetService } from 'services'
import { getKey } from 'lib/keystore'
import * as logger from 'lib/logger'
import { lcd } from 'lib/terra'
import config from 'config'

async function writeOracleAddresses(): Promise<void> {
  const assetService = Container.get(AssetService)
  const assets = await assetService.getAll()
  const address = {}
  for (const asset of assets) {
    if (asset.symbol === config.MIRROR_SYMBOL) {
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
    .requiredOption('--oracle <oracle-password>', 'oracle key password')
    .action(async (symbol, name, { owner, oracle }) => {
      await govService.whitelisting(
        symbol,
        name,
        lcd.wallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner)),
        lcd.wallet(getKey(config.KEYSTORE_PATH, config.ORACLE_KEY, oracle))
      )
      await writeOracleAddresses()
    })

  program
    .command('whitelisting-testnet')
    .requiredOption('--owner <owner-password>', 'owner key password')
    .requiredOption('--oracle <oracle-password>', 'oracle key password')
    .action(async ({ owner, oracle }) => {
      const assets = {
        mAAPL: 'Apple',
        mGOOGL: 'Google',
        mTSLA: 'Tesla',
        mNFLX: 'Netflix',
        mQQQ: 'Invesco QQQ Trust',
        mTWTR: 'Twitter',
        mBABA: 'Alibaba Group Holdings Ltd ADR',
        mIAU: 'iShares Gold Trust',
        mSLV: 'iShares Silver Trust',
        mUSO: 'United States Oil Fund, LP',
        mVIXY: 'ProShares VIX',
      }
      for (const symbol of Object.keys(assets)) {
        await govService.whitelisting(
          symbol,
          assets[symbol],
          lcd.wallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner)),
          lcd.wallet(getKey(config.KEYSTORE_PATH, config.ORACLE_KEY, oracle))
        )
      }
      await writeOracleAddresses()
    })

  program
    .command('oracle-address')
    .description('save oracle address json file to path')
    .action(async () => {
      await writeOracleAddresses()
    })
}
