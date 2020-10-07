import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column, Index } from 'typeorm'
import { HaveAccount } from '../Have'

@Entity('balance_history')
export class BalanceHistoryEntity extends HaveAccount {
  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'jsonb' })
  balances: { [token: string]: string }

  @Column()
  @Index()
  datetime: Date
}
