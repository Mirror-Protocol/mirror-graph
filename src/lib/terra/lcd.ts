import { LCDClient } from '@terra-money/terra.js'

export let lcd: LCDClient = undefined

export function initLCD(URL: string, chainID: string): LCDClient {
  lcd = new LCDClient({ URL, chainID, gasPrices: { uusd: 0.015 } })
  return lcd
}
