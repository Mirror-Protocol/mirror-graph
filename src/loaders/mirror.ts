import { initLCD, initMantle } from 'lib/terra'
import Container from 'typedi'
import { GovService } from 'services'
import config from 'config'

export async function initMirror(): Promise<void> {
  initLCD(config.TERRA_LCD, config.TERRA_CHAIN_ID)
  initMantle(config.TERRA_MANTLE)

  await Container.get(GovService).load(config.CONTRACT_ID)
}
