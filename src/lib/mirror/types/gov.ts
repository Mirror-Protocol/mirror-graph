export interface GovConfig {
  votingPeriod: number
  effectiveDelay: number
  expirationPeriod: number
  mirrorToken: string
  owner: string
  proposalDeposit: string
  quorum: string
  snapshotPeriod: number
  threshold: string
}

export interface GovPoll {
  creator: string
  depositAmount: string
  description: string
  endHeight: number
  executeData: unknown[]
  stakedAmount: string
  id: number
  link?: string
  noVotes: string
  status: string
  title: string
  yesVotes: string
}
