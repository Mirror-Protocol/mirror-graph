import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  JoinColumn,
  OneToMany,
} from 'typeorm'
import { CodeIds, ContractType } from 'types'
import { ContractEntity } from 'orm'

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

  @OneToMany((type) => ContractEntity, (contracts) => contracts.gov, { cascade: true, eager: true })
  @JoinColumn()
  contracts: ContractEntity[]

  // @OneToMany((type) => AssetEntity, (assets) => assets.gov, { cascade: true, eager: true })
  // @JoinColumn()
  // assets: AssetEntity[]

  getContract(type: ContractType): ContractEntity {
    return this.contracts.find((contract) => contract.type === type)
  }
}
