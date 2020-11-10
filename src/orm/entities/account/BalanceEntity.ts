import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column, Index } from 'typeorm'
import { HaveGov } from '../Have'

@Entity('balance')
export class BalanceEntity extends HaveGov {
  constructor(options: Partial<BalanceEntity>) {
    super()

    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  @Index()
  address: string

  @Column()
  @Index()
  token: string

  @Column('decimal', { precision: 40, scale: 6 })
  averagePrice: string

  @Column('numeric', { precision: 40, default: 0 })
  balance: string

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP'})
  @Index()
  datetime: Date
}
