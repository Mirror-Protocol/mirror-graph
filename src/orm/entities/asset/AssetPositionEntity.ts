import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { AssetEntity } from 'orm'

@Entity('asset_position')
@Index('idx_asset_position_assetid', ['assetId'], { unique: true })
export class AssetPositionEntity {
  constructor(options: Partial<AssetPositionEntity>) {
    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column('numeric', { precision: 40, default: 0 })
  mintAmount: string

  @Column('numeric', { precision: 40, default: 0 })
  liquidityAmount: string

  @Column('numeric', { precision: 40, default: 0, comment: 'used as collateral amount' })
  asCollateralAmount: string

  @OneToOne((type) => AssetEntity, { cascade: ['insert'], onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset: AssetEntity

  @Column()
  assetId: number
}
