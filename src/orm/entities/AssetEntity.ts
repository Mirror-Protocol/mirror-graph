import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm'
import { GovEntity, ContractEntity } from 'orm'
import { ContractType } from 'types'

@Entity('asset')
@Index('index_asset_symbol_and_gov', ['symbol', 'gov'], { unique: true })
export class AssetEntity {
  constructor(options: Partial<AssetEntity>) {
    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  symbol: string

  @Column()
  name: string

  @ManyToOne((type) => GovEntity, { onDelete: 'CASCADE', eager: true })
  @JoinColumn()
  gov: GovEntity

  @OneToMany((type) => ContractEntity, (contracts) => contracts.asset, {
    cascade: true,
    eager: true,
  })
  @JoinColumn()
  contracts: ContractEntity[]

  getContract(type: ContractType): ContractEntity {
    return this.contracts.find((contract) => contract.type === type)
  }
}
