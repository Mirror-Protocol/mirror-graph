import {
  Column, Entity, CreateDateColumn, PrimaryGeneratedColumn, Index
} from 'typeorm'

@Entity('tx_hash')
@Index('idx_txhash_height_datetime', ['height', 'txHash', 'datetime'], { unique: true })
export class TxHashEntity {
  constructor(options: Partial<TxHashEntity>) {
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
  datetime: Date
}
