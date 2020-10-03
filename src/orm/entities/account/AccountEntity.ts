import { Entity, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { HaveGov } from '../Have'

@Entity('account')
export class AccountEntity extends HaveGov {
  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryColumn()
  address: string
}
