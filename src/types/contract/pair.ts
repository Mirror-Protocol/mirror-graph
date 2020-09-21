interface NativeTokenInfo {
  nativeToken: { denom: string }
}

interface AssetTokenInfo {
  token: { contractAddr: string }
}

interface AssetInfo {
  info: NativeTokenInfo | AssetTokenInfo
  amount: string
}

export interface Pool {
  totalShare: string // lp token supply
  assets: AssetInfo[]
}
