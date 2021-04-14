import { Column, JoinColumn, ManyToOne, Index } from 'typeorm'
import { HaveGov } from './HaveGov'
import { AssetEntity } from '../asset/AssetEntity'

export class HaveGovAndAsset extends HaveGov {
  @ManyToOne((type) => AssetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'token' })
  asset: AssetEntity

  @Column()
  @Index()
  token: string
}
