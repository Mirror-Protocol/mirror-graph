export interface GovConfig {
  effectiveDelay: number
  mirrorToken: string
  owner: string
  proposalDeposit: string
  quorum: string
  threshold: string
  votingPeriod: number
}

export interface GovPoll {
  creator: string
  depositAmount: string
  description: string
  endHeight: number
  executeData: unknown[]
  id: number
  link?: string
  noVotes: string
  status: string
  title: string
  yesVotes: string
}
