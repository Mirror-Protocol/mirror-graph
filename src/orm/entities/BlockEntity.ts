import { Column, Entity, CreateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'

@Entity('block')
@Index('idx_block_chainid_height', ['chainId', 'height'], { unique: true })
export class BlockEntity {
  @CreateDateColumn()
  createdAt: Date

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
