import {
  Entity, PrimaryGeneratedColumn, CreateDateColumn, Column, Index
} from 'typeorm'
import { HaveAsset } from '../have/HaveAsset'

@Entity('reward')
export class RewardEntity extends HaveAsset {
  constructor(options: Partial<RewardEntity>) {
    super()

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

  @Column('numeric', { precision: 40, default: 0, comment: 'minted reward amount' })
  amount: string

  @Column({ default: false })
  isGovReward: boolean

  @Column()
  @Index()
  datetime: Date
}
