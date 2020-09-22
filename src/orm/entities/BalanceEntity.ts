import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column } from 'typeorm'
import { HaveAccountAndAsset } from './base'

@Entity('balance')
export class BalanceEntity extends HaveAccountAndAsset {
  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  balance: string
}
