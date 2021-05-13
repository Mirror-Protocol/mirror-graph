import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Column } from 'typeorm'

@Entity('gov')
export class GovEntity {
  constructor(options: Partial<GovEntity>) {
    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  chainId: string

  @Column()
  gov: string // gov contract address

  @Column()
  mirrorToken: string

  @Column()
  factory: string

  @Column()
  oracle: string

  @Column()
  mint: string

  @Column()
  staking: string

  @Column()
  tokenFactory: string

  @Column()
  collector: string

  @Column()
  collateralOracle: string

  @Column()
  lock: string
}
