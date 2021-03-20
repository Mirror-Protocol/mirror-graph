import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  Index,
} from 'typeorm'
import { HaveAsset } from '../Have'
import { LimitOrderType } from 'types'

@Entity('limit_order')
export class LimitOrderEntity extends HaveAsset {
  constructor(options: Partial<LimitOrderEntity>) {
    super()

    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryColumn('numeric', { precision: 40, default: 0 })
  id: string

  @Column()
  @Index()
  address: string

  @Column({ type: 'enum', enum: LimitOrderType })
  type: LimitOrderType

  @Column('decimal', { precision: 40, scale: 6 })
  price: string

  @Column('decimal', { precision: 40 })
  amount: string

  @Column('decimal', { precision: 40 })
  uusdAmount: string

  @Column('decimal', { precision: 40, default: 0 })
  filledAmount: string

  @Column('decimal', { precision: 40, default: 0 })
  filledUusdAmount: string
}
