import config from 'config'

const { DECIMALS, NATIVE_TOKEN_SYMBOL, LP_COMMISSION, OWNER_COMMISSION } = config

const initMsgs = {
  collector: {
    collateralDenom: NATIVE_TOKEN_SYMBOL,
    distributionContract: undefined,
    uniswapFactory: undefined,
    mirrorToken: undefined,
  },
  factory: {
    mintPerBlock: '10000000',
    baseDenom: NATIVE_TOKEN_SYMBOL,
    tokenCodeId: undefined,
  },
  gov: {
    mirrorToken: undefined,
    quorum: '0.34',
    threshold: '0.5',
    votingPeriod: 1000,
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
      lpCommission: LP_COMMISSION,
      ownerCommission: OWNER_COMMISSION,
      auctionDiscount: '0.2',
      minCollateralRatio: '1.5'
    }
  },
}

export default initMsgs
