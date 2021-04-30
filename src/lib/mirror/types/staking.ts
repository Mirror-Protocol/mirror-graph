export interface StakingConfig {
  mirrorToken: string
  owner: string
  premiumMinUpdateInterval: number
  premiumShortRewardWeight: string
  premiumTolerance: string
  shortRewardWeight: string
}

export interface StakingPool {
  assetToken: string
  stakingToken: string
  totalBondAmount: string
  rewardIndex: string
}
