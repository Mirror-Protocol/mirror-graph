import { Entity, PrimaryColumn, CreateDateColumn, Column } from 'typeorm'
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

  @Column({ default: false })
  isAppUser: boolean

  @Column({ nullable: true, default: null })
  email?: string
}
