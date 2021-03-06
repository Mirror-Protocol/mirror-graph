import { Entity, Index, PrimaryGeneratedColumn, CreateDateColumn, Column } from 'typeorm'

@Entity('airdrop')
export class AirdropEntity {
  constructor(options: Partial<AirdropEntity>) {
    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column({ default: 'TERRA', comment: 'TERRA or ETH' })
  network: string

  @Column()
  @Index()
  stage: number

  @Column()
  @Index()
  address: string

  @Column('numeric', { precision: 40, default: 0, comment: 'luna staked amount' })
  staked: string

  @Column('numeric', { precision: 40, default: 0, comment: 'total luna staked amount' })
  total: string

  @Column('decimal', { precision: 40, scale: 6, default: 0, comment: 'staked luna rate' })
  rate: string

  @Column('numeric', { precision: 40, default: 0 })
  amount: string

  @Column()
  proof: string

  @Column()
  merkleRoot: string

  @Column({ default: true })
  claimable: boolean
}
