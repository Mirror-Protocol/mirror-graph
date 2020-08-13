export interface CodeIds {
  mint: number
  oracle: number
  token: number
  market: number
}

export interface ContractInfo {
  codeId: number
  address: string
  owner: string
  migratable: boolean
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

export interface MintContractInfo extends ContractInfo {
  initMsg: MintConfig
}

export interface MintWhitelist {
  symbol: string
  oracle: string
  assetToken: string
  totalDeposit: string
  isMintable: boolean
}

export interface MintPosition {
  collateralAmount: string
  assetAmount: string
  isAuctionOpen: boolean
}

export interface MarketConfig {
  owner: string
}

export interface MarketPoolConfig {
  basePool: string
  commissionRate: string
  minSpread: string
  maxSpread: string
  marginThresholdRate: string
  marginDiscountRate: string
}

export interface MarketContractInfo extends ContractInfo {
  initMsg: MarketPoolConfig & {
    mint: string
    collateralDenom: string
  }
}

export interface AssetPool {
  oracle: string
  assetToken: string
  symbol: string
  deltaSign: boolean
  delta: string
  collectedRewards: string
  poolAmount: string
  collateralPoolAmount: string
}

export interface OraclePrice {
  price: string
  priceMultiplier: string
  lastUpdateTime: number
}
