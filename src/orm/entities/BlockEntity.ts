import {
  Column, Entity, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index
} from 'typeorm'

@Entity('block')
@Index('idx_block_chainid_height', ['chainId', 'height'], { unique: true })
export class BlockEntity {
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
