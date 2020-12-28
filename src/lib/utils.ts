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

export function getMIRAnnualRewards(now = Date.now(), isMIR = false): number {
  const GENESIS = 1607022000000
  const YEAR_TO_MILLISECONDS = 31556952000
  const rewards = [3431250, 1715625, 857813, 428906]
  const index = Math.max(0, Math.floor((now - GENESIS) / YEAR_TO_MILLISECONDS))
  const reward = rewards[index]
  return !reward ? undefined : isMIR ? reward * 3 : reward
}
