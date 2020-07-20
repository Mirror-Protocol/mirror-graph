export interface CodeIds {
  mint: number
  oracle: number
  token: number
  market: number
}

export interface MintConfig {
  owner: string
  collateralDenom: string
  depositDenom: string
  whitelistThreshold: string
  mintCapacity: string
  auctionDiscount: string
  auctionThresholdRate: string
}

export interface Whitelist {
  symbol: string
  oracle: string
  assetToken: string
  totalDeposit: string
  isMintable: boolean
}
