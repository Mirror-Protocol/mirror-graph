import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { ContractEntity } from 'orm'

@Entity('asset')
@Index('index_asset_symbol_and_contract', ['symbol', 'contract'], { unique: true })
export class AssetEntity {
  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  symbol: string

  @Column()
  name: string

  @Column({ nullable: true })
  mint?: string

  @Column()
  market: string

  @Column()
  token: string

  @Column()
  lpToken: string

  @Column({ nullable: true })
  oracle?: string

  @ManyToOne(() => ContractEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  contract: ContractEntity
}