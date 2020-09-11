import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  JoinColumn,
  OneToOne,
} from 'typeorm'
import { CodeIds } from 'types'
import { ContractEntity } from 'orm'

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

  @OneToOne((type) => ContractEntity, { eager: true })
  @JoinColumn()
  gov: ContractEntity

  @OneToOne((type) => ContractEntity, { eager: true })
  @JoinColumn()
  factory: ContractEntity

  @OneToOne((type) => ContractEntity, { eager: true })
  @JoinColumn()
  collector: ContractEntity

  @OneToOne((type) => ContractEntity, { eager: true })
  @JoinColumn()
  mirrorToken: ContractEntity
}
