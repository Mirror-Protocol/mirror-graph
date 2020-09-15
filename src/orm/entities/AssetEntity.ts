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

  @Column({ default: '' })
  lpTokenSymbol: string

  @Column()
  name: string

  @ManyToOne((type) => GovEntity, { onDelete: 'CASCADE', eager: true })
  @JoinColumn()
  gov: GovEntity
}
