export interface CodeIds {
  collector: number
  factory: number
  gov: number
  mint: number
  oracle: number
  staking: number
  tokenFactory: number
  pair: number
  token: number
}

export interface Contracts {
  gov: string
  mirrorToken: string
  factory: string
  oracle: string
  mint: string
  staking: string
  tokenFactory: string
  collector: string
  community: string
  collateralOracle: string
  lock: string
}

export interface Asset {
  symbol: string
  name: string
  token: string
  pair: string
  lpToken: string
  status: string
}

export interface Assets {
  [token: string]: Asset
}

export interface OracleAddress {
  oracle: string
  assets: { [symbol: string]: string }
}

export interface Whitelist {
  [symbol: string]: string
}

export interface EthAsset {
  symbol: string
  name: string
  token: string
  terraToken: string
  pair: string
  pool?: string
  status: string
}

export interface EthAssets {
  [token: string]: EthAsset
}

export interface EthPoolInfo {
  lpStaked: string
  rewardRemains: string
}

export interface EthPairInfo {
  lpSupply: string
  ust: string
  asset: string
  price: string
  total: string
}

export interface EthAssetInfos {
  [token: string]: EthAsset & EthPoolInfo & EthPairInfo & { apr: string }
}
