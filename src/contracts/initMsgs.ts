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
  },
  gov: {
    mirrorToken: undefined,
  },
  token: {
    decimals: 6,
    initialBalances: [],
  },
  mint: {
    collateralDenom: config.COLLATERAL_SYMBOL,
    auctionDiscount: '0.1',
    auctionThresholdRate: '0.8',
    mintCapacity: '0.7',
  },
  market: {
    collateralDenom: config.COLLATERAL_SYMBOL,
    maxSpread: '0.2',
    maxMinusSpread: '0.02',
    activeCommission: '0.003',
    inactiveCommission: '0.001',
  },
}

export default initMsgs
