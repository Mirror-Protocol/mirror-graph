import {
  Column, Entity, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index
} from 'typeorm'
import { HaveAsset } from '../have/HaveAsset'
import { Network } from 'types'

export class AssetStatistic extends HaveAsset {
  constructor(options: Partial<AssetStatistic>) {
    super()

    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  datetime: Date

  @Index()
  @Column({ type: 'enum', enum: Network })
  network: Network

  @Column('numeric', { precision: 40, default: 0, comment: 'liquidity pool amount' })
  pool: string

  @Column('numeric', { precision: 40, default: 0, comment: 'liquidity uusd pool amount' })
  uusdPool: string

  @Column('numeric', { precision: 40, default: 0, comment: 'liquidity value' })
  liquidity: string

  @Column('numeric', { precision: 40, default: 0, comment: 'trading volume' })
  volume: string

  @Column('numeric', { precision: 40, default: 0, comment: 'trading fee volume' })
  fee: string

  @Column('numeric', { precision: 40, default: 0, comment: 'trading count' })
  transactions: string
}

@Entity('asset_statistic_daily')
export class AssetDailyEntity extends AssetStatistic {
}

@Entity('asset_statistic_hourly')
export class AssetHourlyEntity extends AssetStatistic {
}
