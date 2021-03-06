import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  Index,
  JoinColumn,
  ManyToOne,
  Entity
} from 'typeorm'
import { TxType, TxData } from 'types'
import { ContractEntity } from '../gov/ContractEntity'
import { HaveGovAndMaybeAsset } from '../have/HaveGovAndMaybeAsset'
 
@Entity('tx')
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
  @Index()
  address: string

  @Column({ type: 'enum', enum: TxType })
  @Index()
  type: TxType

  @Column({ type: 'jsonb' })
  data: TxData

  @Column('numeric', { precision: 40, default: 0, comment: 'uusd volume' })
  volume: string

  @Column('numeric', { precision: 40, default: 0, comment: 'uusd commission fee value' })
  commissionValue: string

  @Column('numeric', { precision: 40, default: 0, comment: 'uusd change value' })
  uusdChange: string

  @Column({ default: '0uusd' })
  fee: string

  @Column({ nullable: true })
  memo?: string

  @Column('text', { default: '{}' })
  tags: string[]

  @Column()
  @Index()
  datetime: Date

  @ManyToOne((type) => ContractEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'contract_id' })
  contract?: ContractEntity

  @Column({ nullable: true })
  contractId?: number
}
