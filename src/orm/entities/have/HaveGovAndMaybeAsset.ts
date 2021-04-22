import { Column, JoinColumn, ManyToOne, Index } from 'typeorm'
import { HaveGov } from './HaveGov'
import { AssetEntity } from '../asset/AssetEntity'

export class HaveGovAndMaybeAsset extends HaveGov {
  @ManyToOne((type) => AssetEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'token' })
  asset?: AssetEntity

  @Column({ nullable: true })
  @Index()
  token?: string
}
