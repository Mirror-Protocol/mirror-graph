import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { ContractEntity } from 'orm'

@Entity('mirror_tx')
export class MirrorTxEntity {
  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  txHash: string

  @Column()
  type: string

  @Column({ nullable: true })
  symbol?: string

  @Column({ type: 'jsonb' })
  data: object

  @Column()
  datetime: Date

  @ManyToOne(() => ContractEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  contract: ContractEntity
}
