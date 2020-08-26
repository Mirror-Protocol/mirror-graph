const {
  ORM,
  SERVER_PORT,
  TERRA_FCD,
  TERRA_LCD,
  TERRA_CHAIN_ID,
  SENTRY_DSN,
  KEYSTORE_PATH,
  CONTRACT_ID,
} = process.env

export function validateConfig(): void {
  const keys = ['TERRA_FCD', 'TERRA_LCD', 'TERRA_CHAIN_ID', 'CONTRACT_ID']
  for (const key of keys) {
    if (!process.env[key]) {
      throw new Error(`process.env.${key} is missing`)
    }
  }
}

const config = {
  ORM: ORM || 'default',
  PORT: SERVER_PORT ? +SERVER_PORT : 3858,
  TERRA_FCD,
  TERRA_LCD,
  TERRA_CHAIN_ID,
  SENTRY_DSN,
  KEYSTORE_PATH: KEYSTORE_PATH || './keystore.json',
  CONTRACT_ID: CONTRACT_ID && +CONTRACT_ID,
  OWNER_KEY: 'owner',
  ORACLE_KEY: 'oracle',
  LP_KEY: 'lp',
  MINT_INIT_MSG: {
    collateralDenom: 'uusd',
    depositDenom: 'uluna',
    whitelistThreshold: '1000000000000',
    auctionDiscount: '0.1',
    auctionThresholdRate: '0.8',
    mintCapacity: '0.7',
  },
  MARKET_INIT_MSG: {
    collateralDenom: 'uusd',
    distributionRate: '5', // takes 5 mirror token per 1UST
    distributionTargetAmount: '1000000000000',
    distributionWindow: '31536000', // a year
  },
  STAKING_TOKEN_INIT_MSG: {
    decimals: 6,
    name: 'Mirror Token',
    symbol: 'MRT',
  },
  STAKING_INIT_MSG: {
    depositPeriod: '86400', // 1 day
    rewardsDenom: 'uusd',
    rollUnit: '100000000',
  },
  CREATE_MARKET_POOL_CONFIG: {
    basePool: '10000000000000',
    commissionRate: '0.001',
    minSpread: '0.0025',
    maxSpread: '0.01',
    marginThresholdRate: '0.8',
    marginDiscountRate: '0.05',
  },
}

export default config
