export interface CodeIds {
  collector: number
  factory: number
  gov: number
  market: number
  mint: number
  oracle: number
  staking: number
  token: number
}

export interface ContractInfo {
  codeId: number
  address: string
  owner: string
  migratable: boolean
}
