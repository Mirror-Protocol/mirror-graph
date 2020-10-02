import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column, Index } from 'typeorm'
import { HaveAccountAndAsset } from '../Have'

@Entity('balance')
@Index('idx_balance_accountid_assetid', ['accountId', 'assetId'], { unique: true })
export class BalanceEntity extends HaveAccountAndAsset {
  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column('numeric', { precision: 40, default: 0 })
  averagePrice: string

  @Column('numeric', { precision: 40, default: 0 })
  balance: string
}
