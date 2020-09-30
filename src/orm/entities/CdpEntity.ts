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
@Index('idx_cdp_idx_assetid', ['idx', 'asset_id'], { unique: true })
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

  @Column()
  mintedAmount: string

  @Column()
  collateralToken: string

  @Column()
  collateralAmount: string
}
