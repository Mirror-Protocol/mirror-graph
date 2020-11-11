import {
  Column, Entity, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index
} from 'typeorm'

@Entity('block')
@Index('idx_block_chainid_height', ['chainId', 'height'], { unique: true })
export class BlockEntity {
  constructor(options: Partial<BlockEntity>) {
    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  chainId: string

  @Column()
  height: number
}
