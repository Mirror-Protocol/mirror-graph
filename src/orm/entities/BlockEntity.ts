import {
  Column, Entity, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn
} from 'typeorm'

@Entity('block')
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
