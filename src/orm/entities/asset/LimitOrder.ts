import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  Index,
} from 'typeorm'
import { HaveAsset } from '../Have'

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

  @Column('numeric', { precision: 40, default: 0 })
  mintAmount: string

  @Column()
  collateralToken: string

  @Column('numeric', { precision: 40, default: 0 })
  collateralAmount: string

  @Column('decimal', { precision: 40, scale: 6, default: 0 })
  collateralRatio: string
}
