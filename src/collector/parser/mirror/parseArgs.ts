import { Coins, TxLog } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { ContractEntity } from 'orm'
import { ContractEvent } from 'lib/terra'

export interface ParseArgs {
  manager: EntityManager
  height: number
  txHash: string
  timestamp: string
  fee: string
  sender: string
  coins: Coins
  msg: unknown
  log: TxLog
  contract: ContractEntity
  contractEvent: ContractEvent
  contractEvents: ContractEvent[]
}
