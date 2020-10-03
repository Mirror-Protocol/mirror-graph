import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { AssetEntity } from 'orm'

@Entity('asset_position')
export class AssetPositionEntity {
  constructor(options?: Partial<AssetPositionEntity>) {
    options && Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryColumn()
  token: string

  @Column('numeric', { precision: 40, default: 0 })
  mintAmount: string

  @Column('numeric', { precision: 40, default: 0 })
  liquidityAmount: string

  @Column('numeric', { precision: 40, default: 0, comment: 'used as collateral amount' })
  asCollateralAmount: string

  @OneToOne((type) => AssetEntity, (asset) => asset.position, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'token' })
  asset: AssetEntity
}
