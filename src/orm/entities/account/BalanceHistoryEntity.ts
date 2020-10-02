import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column, Index } from 'typeorm'
import { HaveAccount } from '../Have'

@Entity('balance_history')
@Index('idx_balance_history_accountid', ['accountId'], { unique: true })
export class BalanceHistoryEntity extends HaveAccount {
  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column('numeric', { precision: 40, default: 0 })
  balance: string

  @Column()
  datetime: Date
}
