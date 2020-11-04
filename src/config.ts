const {
  ORM,
  SERVER_PORT,
  TERRA_LCD,
  TERRA_MANTLE,
  TERRA_CHAIN_ID,
  KEYSTORE_PATH,
  CONTRACT_ID,
} = process.env

export function validateConfig(): void {
  const keys = ['TERRA_LCD', 'TERRA_MANTLE', 'TERRA_CHAIN_ID', 'CONTRACT_ID']
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
  TERRA_MANTLE,
  TERRA_CHAIN_ID,
  CONTRACT_ID: CONTRACT_ID ? +CONTRACT_ID : -1,
  // keys
  KEYSTORE_PATH: KEYSTORE_PATH || './data/mirror-graph.json',
  KEYSTORE_OWNER_KEY: 'owner',
  KEYSTORE_OWNER_PASSWORD: process.env.KEYSTORE_OWNER_PASSWORD,
  KEYSTORE_BOT_KEY: 'bot',
  KEYSTORE_BOT_PASSWORD: process.env.KEYSTORE_BOT_PASSWORD,
  // mirror config
  DECIMALS: 6,
  MIRROR_TOKEN_SYMBOL: 'MIR',
  MIRROR_TOKEN_NAME: 'Mirror Token',
  NATIVE_TOKEN_SYMBOL: 'uusd',
  LP_COMMISSION: '0.0025',
  OWNER_COMMISSION: '0.0005',
  START_BLOCK_HEIGHT: +process.env.START_BLOCK_HEIGHT || 0,
}

export default config
