import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  JoinColumn,
  ManyToOne,
  Index,
} from 'typeorm'
import { GovEntity } from 'orm'
import { AssetCategoty } from 'types'

@Entity('asset')
@Index('index_asset_symbol_and_gov', ['symbol', 'gov'], { unique: true })
export class AssetEntity {
  constructor(options: Partial<AssetEntity>) {
    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  symbol: string

  @Column()
  lpTokenSymbol: string

  @Column()
  name: string

  @Column({ type: 'enum', enum: AssetCategoty, default: AssetCategoty.STOCK })
  categoty: AssetCategoty

  @Column({ default: 'This is description' })
  description: string

  @ManyToOne((type) => GovEntity, { onDelete: 'CASCADE', eager: true })
  @JoinColumn()
  gov: GovEntity
}
