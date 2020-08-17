import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('price')
export default class PriceEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  symbol: string

  @Column()
  datetime: Date

  @Column('decimal', { precision: 40, scale: 18 })
  open: string

  @Column('decimal', { precision: 40, scale: 18 })
  high: string

  @Column('decimal', { precision: 40, scale: 18 })
  low: string

  @Column('decimal', { precision: 40, scale: 18 })
  close: string
}
