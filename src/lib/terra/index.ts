export * from './lcd'
export * from './event'
export * from './TxWallet'
export * from './mantle'
export * from './BlockUpdater'

export function isNativeToken(denom: string): boolean {
  return ['uusd', 'uluna'].includes(denom)
}

export function getBlunaToken(): string {
  if (process.env.TERRA_CHAIN_ID.includes('columbus')) {
    return 'terra1kc87mu460fwkqte29rquh4hc20m54fxwtsx7gp'
  } else if (process.env.TERRA_CHAIN_ID.includes('tequila')) {
    return 'terra1u0t35drzyy0mujj8rkdyzhe264uls4ug3wdp3x'
  }
}

export function getAustToken(): string {
  if (process.env.TERRA_CHAIN_ID.includes('columbus')) {
    return 'terra1hzh9vpxhsk8253se0vv5jj6etdvxu3nv8z07zu'
  } else if (process.env.TERRA_CHAIN_ID.includes('tequila')) {
    return 'terra1ajt556dpzvjwl0kl5tzku3fc3p3knkg9mkv8jl'
  }
}

export function getAnchorToken(): string {
  if (process.env.TERRA_CHAIN_ID.includes('columbus')) {
    return 'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76'
  } else if (process.env.TERRA_CHAIN_ID.includes('tequila')) {
    return 'terra1747mad58h0w4y589y3sk84r5efqdev9q4r02pc'
  }
}
