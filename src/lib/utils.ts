export function splitTokenAmount(tokenAmount: string): { token: string; amount: string } {
  const m = tokenAmount.match(/^([0-9]+(\.[0-9]+)?)([a-zA-Z0-9]+)$/)
  if (m === null) {
    throw new Error('failed to parse to token amount: ' + tokenAmount)
  }

  return { token: m[3], amount: m[1] }
}

export function toAssetAmount(token: string, amount: string): unknown {
  const info =
    token === 'uusd' ? { nativeToken: { denom: token } } : { token: { contractAddr: token } }

  return { info, amount }
}

export function limitedRange(
  from: number, to: number, interval: number, limit: number
) : { from: number; to: number } {
  const count = Math.min(Math.floor((to - from) / interval))

  return {
    from,
    to: count > limit ? from + (interval * limit) : to
  }
}