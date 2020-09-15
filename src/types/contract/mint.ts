export interface MintConfigGeneral {
  owner: string
  collateralDenom: string
  auctionDiscount: string
  auctionThresholdRate: string
  mintCapacity: string
}

export interface MintConfigAsset {
  oracle: string
  token: string
  symbol: string
}
