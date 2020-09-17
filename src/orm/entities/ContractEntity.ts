import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { GovEntity, AssetEntity } from 'orm'
import { ContractType } from 'types'

@Entity('contract')
@Index('idx_contract_address_type_gov', ['address', 'type', 'gov'], { unique: true })
export class ContractEntity {
  constructor(options: Partial<ContractEntity>) {
    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  address: string

  @Column({ type: 'enum', enum: ContractType })
  type: ContractType

  @ManyToOne((type) => GovEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gov_id' })
  gov: GovEntity

  @Column()
  govId: number

  @ManyToOne((type) => AssetEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'asset_id' })
  asset?: AssetEntity

  @Column({ nullable: true })
  assetId?: number
}
