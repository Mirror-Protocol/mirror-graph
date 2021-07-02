import {
  Column, Entity, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index
} from 'typeorm'
import { HaveAsset } from '../have/HaveAsset'

@Entity('oracle_price')
export class OraclePriceEntity extends HaveAsset {
  constructor(options: Partial<OraclePriceEntity>) {
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
  @Index()
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
