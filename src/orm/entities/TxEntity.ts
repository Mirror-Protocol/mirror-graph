import {
  Entity, PrimaryGeneratedColumn, CreateDateColumn, Column, Index, JoinColumn, ManyToOne
} from 'typeorm'
import { TxType } from 'types'
import { ContractEntity } from 'orm'
import { HaveGovAndMaybeAsset } from './base'

@Entity('tx')
@Index('idx_tx_account_datetime_gov', ['account', 'datetime', 'gov'], { unique: true })
export class TxEntity extends HaveGovAndMaybeAsset {
  constructor(options: Partial<TxEntity>) {
    super()
    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  height: number

  @Column()
  txHash: string

  @Column()
  account: string

  @Column({ type: 'enum', enum: TxType })
  type: TxType

  @Column('numeric', { precision: 40, default: 0 })
  inValue: string

  @Column('numeric', { precision: 40, default: 0 })
  outValue: string

  @Column({ type: 'jsonb' })
  data: object

  @Column()
  datetime: Date

  @ManyToOne((type) => ContractEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: ContractEntity

  @Column()
  contractId: number
}
