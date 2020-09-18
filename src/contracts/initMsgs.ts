import config from 'config'

const { DECIMALS, NATIVE_TOKEN_SYMBOL, ACTIVE_COMMISSION, PASSIVE_COMMISSION } = config

const initMsgs = {
  collector: {
    collateralDenom: NATIVE_TOKEN_SYMBOL,
    factoryContract: undefined,
    govContract: undefined,
    mirrorToken: undefined,
  },
  factory: {
    mintPerBlock: '10000000',
    baseDenom: NATIVE_TOKEN_SYMBOL,
    tokenCodeId: undefined,
  },
  gov: {
    mirrorToken: undefined,
    quorum: '0.3',
    threshold: '0.5',
    votingPeriod: 10000,
  },
  mint: {
    baseAssetInfo: { nativeToken: { denom: NATIVE_TOKEN_SYMBOL } },
    oracle: undefined,
    owner: undefined,
    tokenCodeId: undefined
  },
  oracle: {
    baseAssetInfo: { nativeToken: { denom: NATIVE_TOKEN_SYMBOL } },
    owner: undefined,
  },
  staking: {
    mirrorToken: undefined,
    owner: undefined,
  },
  // uniswap contracts
  tokenFactory: {
    pairCodeId: undefined,
    tokenCodeId: undefined,
  },
  pair: {
    assetInfos: undefined,
    activeCommission: '0.003',
    passiveCommission: '0.001',
    commissionCollector: undefined,
    owner: undefined,
    tokenCodeId: undefined,
  },
  token: {
    decimals: DECIMALS,
    initialBalances: [],
    name: undefined,
    symbol: undefined,
  },
  whitelist: {
    symbol: undefined,
    name: undefined,
    oracleFeeder: undefined,
    params: {
      weight: '1.0',
      activeCommission: ACTIVE_COMMISSION,
      passiveCommission: PASSIVE_COMMISSION,
      auctionDiscount: '0.2',
      auctionThresholdRatio: '1.3',
      minCollateralRatio: '1.5'
    }
  },
}

export default initMsgs
