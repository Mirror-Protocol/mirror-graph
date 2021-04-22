import {
  Column, Entity, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index
} from 'typeorm'
import { HaveAsset } from '../have/HaveAsset'

@Entity('price')
@Index('idx_price_datetime_asset', ['datetime', 'asset'], { unique: true })
export class PriceEntity extends HaveAsset {
  constructor(options: Partial<PriceEntity>) {
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
  datetime: Date

  @Column('decimal', { precision: 40, scale: 6 })
  open: string

  @Column('decimal', { precision: 40, scale: 6 })
  high: string

  @Column('decimal', { precision: 40, scale: 6 })
  low: string

  @Column('decimal', { precision: 40, scale: 6 })
  close: string
}
