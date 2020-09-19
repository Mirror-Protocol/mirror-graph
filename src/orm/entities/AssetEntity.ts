import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  Index,
  BeforeInsert,
} from 'typeorm'
import { AssetCategoty } from 'types'
import { HaveGov } from './base'

@Entity('asset')
@Index('idx_asset_symbol_and_address_and_gov', ['symbol', 'address', 'gov'], { unique: true })
export class AssetEntity extends HaveGov {
  constructor(options: Partial<AssetEntity>) {
    super()

    Object.assign(this, options)
  }

  @BeforeInsert()
  beforeInsert(): void {
    this.lpTokenSymbol = `${this.symbol}-LP`
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  address: string // token

  @Column()
  symbol: string

  @Column()
  lpTokenSymbol: string

  @Column()
  name: string

  @Column({ type: 'enum', enum: AssetCategoty, default: AssetCategoty.STOCK })
  category: AssetCategoty

  @Column({ default: '' })
  description: string

  @Column()
  pair: string // pair token address

  @Column()
  lpToken: string // lpToken address
}
