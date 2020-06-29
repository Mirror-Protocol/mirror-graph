export enum ProgramType {
  MINTER = 'minter',
  ORACLE = 'oracle',
  DEPOSIT_TOKEN = 'deposit_token',
  COLLATERAL_TOKEN = 'collateral_token',
}

export interface ProgramIds {
  mint: string
  oracle: string
  token: string
  market: string
}

export interface ProgramKeys {
  key: string
  ownerSecretKey: string
}
