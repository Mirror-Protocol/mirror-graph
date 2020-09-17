import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { GovEntity } from 'orm'
import { TxType } from 'types'

@Entity('tx')
@Index('idx_tx_sender_datetime_msgindex_gov', ['sender', 'datetime', 'msgIndex', 'gov'], { unique: true })
export class TxEntity {
  constructor(options: Partial<TxEntity>) {
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

  @ManyToOne((type) => GovEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gov_id' })
  gov: GovEntity

  @Column()
  govId: number
}
