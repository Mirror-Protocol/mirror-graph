import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Column } from 'typeorm'
import { CodeIds } from 'types'

@Entity('contract')
export class ContractEntity {
  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'jsonb' })
  codeIds: CodeIds

  @Column()
  gov: string

  @Column()
  factory: string

  @Column()
  collector: string

  @Column()
  owner: string

  @Column()
  chainId: string
}
