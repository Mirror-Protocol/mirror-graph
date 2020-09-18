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

export interface ContractInfo {
  codeId: number
  address: string
  owner: string
  migratable: boolean
}

export enum ContractType {
  COLLECTOR = 'COLLECTOR',
  FACTORY = 'FACTORY',
  GOV = 'GOV',
  MARKET = 'MARKET', // todo: remove
  MINT = 'MINT',
  ORACLE = 'ORACLE',
  STAKING = 'STAKING',
  TOKEN = 'TOKEN',
  LP_TOKEN = 'LP_TOKEN',
  TOKEN_FACTORY = 'TOKEN_FACTORY',
  PAIR = 'PAIR',
}
