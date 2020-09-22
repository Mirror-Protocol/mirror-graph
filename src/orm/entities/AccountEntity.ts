import {
  Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Column, Index
} from 'typeorm'
import { HaveGov } from './base'

@Entity('account')
export class AccountEntity extends HaveGov {
  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  @Index()
  address: string
}
