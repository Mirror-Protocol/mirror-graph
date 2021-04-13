import { Column, JoinColumn, ManyToOne, Index } from 'typeorm'
import { AssetEntity } from '../asset/AssetEntity'

export class HaveAsset {
  @ManyToOne((type) => AssetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'token' })
  asset: AssetEntity

  @Column()
  @Index()
  token: string
}
