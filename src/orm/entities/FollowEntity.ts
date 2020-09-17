import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToMany,
  JoinColumn,
  Index,
  Column,
} from 'typeorm'
import { AccountEntity, AssetEntity } from 'orm'

@Entity('follow')
@Index('idx_follow_address_asset', ['accountId', 'assetId'], { unique: true })
export class FollowEntity {
  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @ManyToMany((type) => AssetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity

  @Column()
  accountId: number

  @ManyToMany((type) => AssetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset: AssetEntity

  @Column()
  assetId: number
}
