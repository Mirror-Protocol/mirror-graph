import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { ObjectType, Field } from 'type-graphql'
import { ContractEntity } from 'orm'

@ObjectType()
@Entity('asset')
@Index('index_asset_symbol_and_contract', ['symbol', 'contract'], { unique: true })
export class AssetEntity {
  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Field()
  @Column()
  symbol: string

  @Field()
  @Column()
  name: string

  @Field({ description: 'token account address' })
  @Column()
  token: string

  @Field({ description: 'oracle account address' })
  @Column()
  oracle: string

  @ManyToOne(() => ContractEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  contract: ContractEntity
}
