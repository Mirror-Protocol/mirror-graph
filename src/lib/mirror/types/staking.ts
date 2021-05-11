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
  totalShortAmount: string
  rewardIndex: string
  shortRewardIndex: string
  pendingReward: string
  shortPendingReward: string
  premiumRate: string
  premiumUpdatedTime: number
}
