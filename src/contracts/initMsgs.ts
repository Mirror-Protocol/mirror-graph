import config from 'config'

const initMsgs = {
  collector: {
    collateralDenom: config.COLLATERAL_SYMBOL,
    factoryContract: undefined,
    govContract: undefined,
    mirrorSymbol: config.MIRROR_TOKEN_SYMBOL,
    mirrorToken: undefined,
  },
  factory: {
    mintPerBlock: '100',
    mirrorToken: undefined,
  },
  gov: {
    mirrorToken: undefined,
  },
  token: {
    decimals: 6,
    initialBalances: [],
    name: undefined,
    symbol: undefined,
  },
  mint: {
    collateralDenom: config.COLLATERAL_SYMBOL,
    auctionDiscount: '0.1',
    auctionThresholdRate: '0.8',
    mintCapacity: '0.7',
  },
  market: {
    collateralDenom: config.COLLATERAL_SYMBOL,
    activeCommission: '0.003',
    inactiveCommission: '0.001',
    assetSymbol: undefined,
    assetToken: undefined,
    commissionCollector: undefined,
  },
}

export default initMsgs
