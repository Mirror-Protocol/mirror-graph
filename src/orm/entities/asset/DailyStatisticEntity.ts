import {
  Column, Entity, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index
} from 'typeorm'

@Entity('daily_statistic')
export class DailyStatisticEntity {
  constructor(options: Partial<DailyStatisticEntity>) {
    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  @Index()
  datetime: Date

  @Column('numeric', { precision: 40, default: 0, comment: 'cumulative liquidity ust value' })
  cumulativeLiquidity: string

  @Column('numeric', { precision: 40, default: 0, comment: 'trading volume of today' })
  tradingVolume: string
}
