import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Column } from 'typeorm'
import { CodeIds } from 'types'
import { GovContracts } from './base'

@Entity('gov')
export class GovEntity extends GovContracts {
  constructor(options: Partial<GovEntity>) {
    super()
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
}
