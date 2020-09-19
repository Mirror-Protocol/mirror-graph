import { Column, JoinColumn, ManyToOne } from 'typeorm'
import { GovEntity, AssetEntity } from 'orm'

export class HaveGov {
  @ManyToOne((type) => GovEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gov_id' })
  gov: GovEntity

  @Column()
  govId: number
}

export class HaveAsset {
  @ManyToOne((type) => AssetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset: AssetEntity

  @Column()
  assetId: number
}

export class HaveGovAndAsset extends HaveGov {
  @ManyToOne((type) => AssetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset: AssetEntity

  @Column()
  assetId: number
}

export class HaveGovAndMaybeAsset extends HaveGov {
  @ManyToOne((type) => AssetEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'asset_id' })
  asset?: AssetEntity

  @Column({ nullable: true })
  assetId?: number
}
