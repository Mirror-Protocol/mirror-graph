import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column } from 'typeorm'
import { HaveAccount } from './base'

@Entity('balance_history')
export class BalanceHistoryEntity extends HaveAccount {
  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  balance: string

  @Column()
  datetime: Date
}
