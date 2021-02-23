import { initLCD, initMantle } from 'lib/terra'
import { loadContracts, loadAssets } from 'lib/data'
import * as logger from 'lib/logger'
import { govService } from 'services'
import config from 'config'

export async function initMirror(): Promise<void> {
  logger.info('Initialize lcd')
  initLCD(config.TERRA_LCD, config.TERRA_CHAIN_ID)
  logger.info('Initialize mantle')
  initMantle(config.TERRA_MANTLE)

  const gov = await govService().load(config.CONTRACT_ID)
  if (!gov) {
    const contracts = loadContracts()
    const assets = loadAssets()

    logger.info('create mirror gov from json files')

    await govService().create(contracts, assets)

    if (!(await govService().load(-1))) {
      throw new Error('create mirror gov failed')
    }
  }
}
