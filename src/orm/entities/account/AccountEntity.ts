import { Entity, PrimaryColumn, CreateDateColumn } from 'typeorm'
import { HaveGov } from '../Have'

@Entity('account')
export class AccountEntity extends HaveGov {
  constructor(options: Partial<AccountEntity>) {
    super()

    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @PrimaryColumn()
  address: string
}
