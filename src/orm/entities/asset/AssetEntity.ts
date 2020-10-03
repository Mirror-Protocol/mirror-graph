import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  OneToOne,
} from 'typeorm'
import { AssetPositionEntity } from './AssetPositionEntity'
import { HaveGov } from '../Have'

@Entity('asset')
export class AssetEntity extends HaveGov {
  constructor(options: Partial<AssetEntity>) {
    super()

    Object.assign(this, options)

    this.position = new AssetPositionEntity({ asset: this })
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

  @Column()
  lpToken: string // lpToken address

  @Column()
  pair: string // pair address

  @OneToOne(
    (type) => AssetPositionEntity,
    (position) => position.asset,
    { cascade: true, eager: true }
  )
  position: AssetPositionEntity
}
