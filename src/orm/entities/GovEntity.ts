import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Column } from 'typeorm'
import { CodeIds } from 'types'

@Entity('gov')
export class GovEntity {
  constructor(options: Partial<GovEntity>) {
    Object.assign(this, options)
  }

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
  mirrorToken: string // mirror token contract address
}
