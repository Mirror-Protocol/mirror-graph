import {
  Entity, PrimaryGeneratedColumn, CreateDateColumn, Column, Index, JoinColumn, ManyToOne
} from 'typeorm'
import { TxType } from 'types'
import { ContractEntity } from 'orm'
import { HaveGovAndMaybeAsset } from '../Have'

@Entity('tx')
@Index('idx_tx_address_datetime_gov', ['address', 'datetime', 'gov'])
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
  address: string

  @Column({ type: 'enum', enum: TxType })
  type: TxType

  @Column({ type: 'jsonb' })
  data: object

  @Column('numeric', { precision: 40, default: 0, comment: 'uusd volume' })
  volume: string

  @Column('numeric', { precision: 40, default: 0, comment: 'uusd commission fee value' })
  commissionValue: string

  @Column({ default: '0uusd' })
  fee: string

  @Column({ nullable: true, default: null })
  memo?: string

  @Column()
  datetime: Date

  @ManyToOne((type) => ContractEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'contract_id' })
  contract?: ContractEntity

  @Column({ nullable: true })
  contractId?: number
}
