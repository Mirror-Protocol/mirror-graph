const {
  ORM,
  SERVER_PORT,
  TERRA_URL,
  TERRA_LCD,
  TERRA_CHAIN_ID,
  SENTRY_DSN,
  KEYSTORE_PATH,
  CONTRACT_ID,
} = process.env

export function validateConfig(): void {
  const keys = ['TERRA_URL', 'TERRA_LCD', 'TERRA_CHAIN_ID', 'CONTRACT_ID']
  for (const key of keys) {
    if (!process.env[key]) {
      throw new Error(`process.env.${key} is missing`)
    }
  }
}

const config = {
  ORM: ORM || 'default',
  PORT: SERVER_PORT ? +SERVER_PORT : 3858,
  TERRA_URL,
  TERRA_LCD,
  TERRA_CHAIN_ID,
  SENTRY_DSN,
  KEYSTORE_PATH: KEYSTORE_PATH || './keystore.json',
  CONTRACT_ID: CONTRACT_ID && +CONTRACT_ID,
  OWNER_KEY: 'owner',
  ORACLE_KEY: 'oracle',
  LP_KEY: 'lp',
  BASE_MINT_CONFIG: {
    collateralDenom: 'uusd',
    depositDenom: 'uluna',
    whitelistThreshold: '1000000000000',
    auctionDiscount: '0.1',
    auctionThresholdRate: '0.8',
    mintCapacity: '0.7',
  },
  BASE_MARKET_CONFIG: {
    collateralDenom: 'uusd',
    basePool: '1000000000000',
    commissionRate: '0.001', // 0.1%
    maxSpread: '0.01', // 1%
    minSpread: '0.001', // 0.1%
    marginThresholdRate: '0.05', // 5%
    marginDiscountRate: '0.01', // 1%
  },
  BASE_MARKET_POOL_CONFIG: {
    basePool: '1000000',
    commissionRate: '0.001',
    minSpread: '0.0025',
    maxSpread: '0.01',
    marginThresholdRate: '0.8',
    marginDiscountRate: '0.05',
  },
}

export default config
