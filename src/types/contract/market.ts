import { ContractInfo } from './contract'

export interface MarketContractInfo extends ContractInfo {
  initMsg: {
    collateralDenom: string
    maxSpread: string
    maxMinusSpread: string
    activeCommission: string
    inactiveCommission: string
    commissionCollector: string
    assetToken: string
    assetOracle: string
    assetSymbol: string
  }
}

export interface MarketPool {
  totalShare: string // lp token supply
  assetPool: string // asset token balance of market contract
  collateralPool: string // collateral balance of market contract
}
