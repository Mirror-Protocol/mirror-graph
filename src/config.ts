const { ORM, SERVER_PORT, TERRA_LCD, TERRA_CHAIN_ID, KEYSTORE_PATH, CONTRACT_ID } = process.env

export function validateConfig(): void {
  const keys = ['TERRA_LCD', 'TERRA_CHAIN_ID', 'CONTRACT_ID']
  for (const key of keys) {
    if (!process.env[key]) {
      throw new Error(`process.env.${key} is missing`)
    }
  }
}

const config = {
  ORM: ORM || 'default',
  PORT: SERVER_PORT ? +SERVER_PORT : 3858,
  TERRA_LCD,
  TERRA_CHAIN_ID,
  KEYSTORE_PATH: KEYSTORE_PATH || './keystore.json',
  CONTRACT_ID: CONTRACT_ID && +CONTRACT_ID,
  OWNER_KEY: 'owner',
  ORACLE_KEY: 'oracle',
  LP_KEY: 'lp',
  MIRROR_SYMBOL: 'MIR',
  COLLATERAL_SYMBOL: 'uusd',
}

export default config
