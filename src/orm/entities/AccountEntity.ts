import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm'
import { GovEntity } from 'orm'

@Entity('account')
export class AccountEntity {
  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  @Index()
  address: string

  @ManyToOne((type) => GovEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gov_id' })
  gov: GovEntity

  @Column()
  govId: number
}
