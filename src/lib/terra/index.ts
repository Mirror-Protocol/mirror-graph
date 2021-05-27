export * from './lcd'
export * from './event'
export * from './TxWallet'
export * from './mantle'

export function isNativeToken(denom: string): boolean {
  return ['uusd', 'uluna'].includes(denom)
}
