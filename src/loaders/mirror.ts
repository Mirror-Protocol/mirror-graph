import { initLCD, initMantle, TxWallet } from 'lib/terra'
import { loadContracts, loadAssets } from 'lib/data'
import { getKey } from 'lib/keystore'
import * as logger from 'lib/logger'
import { govService } from 'services'
import config from 'config'

export async function initMirror(): Promise<void> {
  initLCD(config.TERRA_LCD, config.TERRA_CHAIN_ID)
  initMantle(config.TERRA_MANTLE)

  const gov = await govService().load(config.CONTRACT_ID)
  if (!gov) {
    const contracts = loadContracts()
    const assets = loadAssets()

    logger.info('create mirror gov from json files')

    const ownerPassword = process.env.OWNER_PASSWORD
    if (!ownerPassword) {
      throw new Error('required process.env.OWNER_PASSWORD')
    }
    const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, ownerPassword))

    await govService().create(wallet, contracts, assets)

    if (!await govService().load(-1)) {
      throw new Error('create mirror gov failed')
    }
  }
}
