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

export enum ContractType {
  COLLECTOR = 'collector',
  FACTORY = 'factory',
  GOV = 'gov',
  MARKET = 'market',
  MINT = 'mint',
  ORACLE = 'oracle',
  STAKING = 'staking',
  TOKEN = 'token',
  LPTOKEN = 'lptoken',
}
