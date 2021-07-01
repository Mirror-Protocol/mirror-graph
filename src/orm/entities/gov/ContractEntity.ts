import { Entity, PrimaryColumn, CreateDateColumn, Column, Index } from 'typeorm'
import { ContractType } from 'types'
import { HaveGovAndMaybeAsset } from '../have/HaveGovAndMaybeAsset'

@Entity('contract')
export class ContractEntity extends HaveGovAndMaybeAsset {
  constructor(options: Partial<ContractEntity>) {
    super()
    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @PrimaryColumn()
  address: string

  @Column({ type: 'enum', enum: ContractType })
  @Index()
  type: ContractType
}
