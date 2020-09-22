import { Column, JoinColumn, ManyToOne } from 'typeorm'
import { GovEntity, AssetEntity, AccountEntity } from 'orm'

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

export class HaveAccount {
  @ManyToOne((type) => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity

  @Column()
  accountId: number
}

export class HaveAccountAndAsset extends HaveAsset {
  @ManyToOne((type) => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity

  @Column()
  accountId: number
}
