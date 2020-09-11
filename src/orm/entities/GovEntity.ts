import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Column } from 'typeorm'
import { CodeIds } from 'types'

@Entity('gov')
export class GovEntity {
  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'jsonb' })
  codeIds: CodeIds

  @Column()
  chainId: string

  @Column()
  owner: string

  @Column()
  gov: string

  @Column()
  factory: string

  @Column()
  collector: string

  @Column()
  mirrorToken: string
}
