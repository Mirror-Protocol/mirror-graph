import {
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { AssetEntity } from 'orm'

@Entity('price')
@Index('idx_price_datetime_asset', ['datetime', 'asset'], {
  unique: true,
})
export class PriceEntity {
  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  datetime: Date

  @Column('decimal', { precision: 40, scale: 6 })
  open: string

  @Column('decimal', { precision: 40, scale: 6 })
  high: string

  @Column('decimal', { precision: 40, scale: 6 })
  low: string

  @Column('decimal', { precision: 40, scale: 6 })
  close: string

  @ManyToOne((type) => AssetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset: AssetEntity

  @Column()
  assetId: number
}
