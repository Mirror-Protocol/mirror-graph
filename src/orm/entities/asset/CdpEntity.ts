import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  Index,
} from 'typeorm'
import { HaveAsset } from '../Have'

@Entity('cdp')
export class CdpEntity extends HaveAsset {
  constructor(options: Partial<CdpEntity>) {
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
}
