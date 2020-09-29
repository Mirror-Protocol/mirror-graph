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
  MINT = 'mint',
  ORACLE = 'oracle',
  STAKING = 'staking',
  TOKEN = 'token',
  LP_TOKEN = 'lpToken',
  TOKEN_FACTORY = 'tokenFactory',
  PAIR = 'pair',
}
