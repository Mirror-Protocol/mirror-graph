import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column, Index } from 'typeorm'
import { HaveAsset } from '../Have'

@Entity('balance')
export class BalanceEntity extends HaveAsset {
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

  @Column('decimal', { precision: 40, scale: 6 })
  averagePrice: string

  @Column('numeric', { precision: 40, default: 0 })
  balance: string
}
