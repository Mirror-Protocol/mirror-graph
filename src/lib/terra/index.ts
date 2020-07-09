import { initLCD } from './lcd'

export function initTerra(lcdURL: string, chainID: string): void {
  initLCD(lcdURL, chainID)
}

export * from './lcd'
export * from './transaction'
export * from './contract'
