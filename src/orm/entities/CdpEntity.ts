import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  Index,
} from 'typeorm'
import { HaveGovAndAsset } from './base'

@Entity('cdp')
@Index('idx_cdp_idx_assetid', ['idx', 'assetId'], { unique: true })
export class CdpEntity extends HaveGovAndAsset {
  constructor(options: Partial<CdpEntity>) {
    super()

    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  idx: string

  @Column('numeric', { precision: 40, default: 0 })
  mintAmount: string

  @Column()
  collateralToken: string

  @Column('numeric', { precision: 40, default: 0 })
  collateralAmount: string
}
