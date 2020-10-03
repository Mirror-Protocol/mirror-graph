import { Entity, PrimaryColumn, CreateDateColumn, Column, Index } from 'typeorm'
import { ContractType } from 'types'
import { HaveGovAndMaybeAsset } from '../Have'

@Entity('contract')
@Index('idx_contract_address_type_gov', ['address', 'type', 'gov'], { unique: true })
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
  type: ContractType
}
