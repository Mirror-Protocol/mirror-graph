import {
  Entity, PrimaryGeneratedColumn, CreateDateColumn, Column, Index
} from 'typeorm'
import { TxType } from 'types'
import { HaveGovAndMaybeAsset } from './base'

@Entity('tx')
@Index('idx_tx_sender_datetime_msgindex_gov', ['sender', 'datetime', 'msgIndex', 'gov'], { unique: true })
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
  txHash: string

  @Column()
  msgIndex: number

  @Column()
  sender: string

  @Column({ type: 'enum', enum: TxType })
  type: TxType

  @Column({ nullable: true })
  symbol?: string

  @Column({ type: 'jsonb' })
  data: object

  @Column()
  datetime: Date
}
