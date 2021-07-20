import { Entity, PrimaryColumn, CreateDateColumn, Column } from 'typeorm'

@Entity('account')
export class AccountEntity {
  constructor(options: Partial<AccountEntity>) {
    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @PrimaryColumn()
  address: string

  @Column({ default: false })
  isAppUser: boolean

  @Column({ nullable: true })
  email?: string

  @Column('numeric', { precision: 40, nullable: true, default: null })
  govStaked?: string

  @Column('numeric', { precision: 40, nullable: true, default: null })
  withdrawnGovRewards?: string
}
