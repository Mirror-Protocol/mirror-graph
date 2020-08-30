import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm'

@Entity('block')
@Index('index_chainid_and_height', ['chainId', 'height'], { unique: true })
export class BlockEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  chainId: string

  @Column()
  height: number

  @Column()
  datetime: Date

  @Column('text', { array: true })
  txs: string[]
}
