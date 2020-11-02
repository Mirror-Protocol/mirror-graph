import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  OneToOne,
} from 'typeorm'
import { AssetStatus } from 'types'
import { AssetPositionsEntity } from './AssetPositionsEntity'
import { HaveGov } from '../Have'

@Entity('asset')
export class AssetEntity extends HaveGov {
  constructor(options: Partial<AssetEntity>) {
    super()

    Object.assign(this, options)

    this.positions = new AssetPositionsEntity({ asset: this })
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryColumn()
  token: string // token address

  @Column()
  symbol: string

  @Column()
  name: string

  @Column({ default: '' })
  description: string

  @Column()
  lpToken: string // lpToken address

  @Column()
  pair: string // pair address

  @Column({ type: 'enum', enum: AssetStatus, default: AssetStatus.NONE })
  status: AssetStatus

  @OneToOne(
    (type) => AssetPositionsEntity,
    (positions) => positions.asset,
    { cascade: true, eager: true }
  )
  positions: AssetPositionsEntity
}
