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
@Index('index_tx_datetime', ['datetime'], { unique: true })
export class TxEntity {
  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  txHash: string

  @Column({ type: 'enum', enum: TxType })
  type: TxType

  @Column({ nullable: true })
  symbol?: string

  @Column({ type: 'jsonb' })
  data: object

  @Column()
  datetime: Date

  @ManyToOne((type) => GovEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  gov: GovEntity
}
