import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  Index,
} from 'typeorm'
import { HaveGov } from './base'

@Entity('asset')
@Index('idx_asset_symbol_and_token_and_gov', ['symbol', 'token', 'gov'], { unique: true })
export class AssetEntity extends HaveGov {
  constructor(options: Partial<AssetEntity>) {
    super()

    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  symbol: string

  @Column()
  name: string

  @Column()
  token: string // token address

  @Column()
  lpToken: string // lpToken address

  @Column()
  pair: string // pair address
}
