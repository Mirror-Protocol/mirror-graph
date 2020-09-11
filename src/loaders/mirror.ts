import { initLCD } from 'lib/terra/lcd'
import Container from 'typedi'
import { GovService } from 'services'
import config from 'config'

export async function initMirror(): Promise<void> {
  initLCD(config.TERRA_LCD, config.TERRA_CHAIN_ID)

  await Container.get(GovService).load(config.CONTRACT_ID)
}
