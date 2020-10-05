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

@Entity('asset_positions')
export class AssetPositionsEntity {
  constructor(options?: Partial<AssetPositionsEntity>) {
    options && Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryColumn()
  token: string

  @Column('numeric', { precision: 40, default: 0, comment: 'total minted amount' })
  mint: string

  @Column('numeric', { precision: 40, default: 0, comment: 'total liquidity amount' })
  liquidity: string

  @Column('numeric', { precision: 40, default: 0, comment: 'total uusd liquidity amount' })
  uusdLiquidity: string

  @Column('numeric', { precision: 40, default: 0, comment: 'current liquidity pool amount' })
  pool: string

  @Column('numeric', { precision: 40, default: 0, comment: 'current liquidity uusd pool amount' })
  uusdPool: string

  @Column('numeric', { precision: 40, default: 0, comment: 'total used as collateral amount' })
  asCollateral: string

  @OneToOne((type) => AssetEntity, (asset) => asset.positions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'token' })
  asset: AssetEntity
}
