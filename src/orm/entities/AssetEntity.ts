import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  Index,
} from 'typeorm'
import { GovEntity, ContractEntity } from 'orm'

@Entity('asset')
@Index('index_asset_symbol_and_gov', ['symbol', 'gov'], { unique: true })
export class AssetEntity {
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

  @OneToOne((type) => ContractEntity, { eager: true })
  @JoinColumn()
  mint?: ContractEntity

  @OneToOne((type) => ContractEntity, { eager: true })
  @JoinColumn()
  market: ContractEntity

  @OneToOne((type) => ContractEntity, { eager: true })
  @JoinColumn()
  token: ContractEntity

  @OneToOne((type) => ContractEntity, { eager: true })
  @JoinColumn()
  lpToken: ContractEntity

  @OneToOne((type) => ContractEntity, { eager: true })
  @JoinColumn()
  oracle?: ContractEntity

  @ManyToOne(() => GovEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  gov: GovEntity
}
