import { initLCD } from 'lib/terra/lcd'
import Container from 'typedi'
import { ContractService } from 'services'
import config from 'config'

export async function initMirror(): Promise<void> {
  initLCD(config.TERRA_LCD, config.TERRA_CHAIN_ID)

  await Container.get(ContractService).load(config.CONTRACT_ID)
}
