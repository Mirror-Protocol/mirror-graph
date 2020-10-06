import { Column, JoinColumn, ManyToOne, Index } from 'typeorm'
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
  @JoinColumn({ name: 'token' })
  asset: AssetEntity

  @Column()
  @Index()
  token: string
}

export class HaveGovAndAsset extends HaveGov {
  @ManyToOne((type) => AssetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'token' })
  asset: AssetEntity

  @Column()
  @Index()
  token: string
}

export class HaveGovAndMaybeAsset extends HaveGov {
  @ManyToOne((type) => AssetEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'token' })
  asset?: AssetEntity

  @Column({ nullable: true })
  @Index()
  token?: string
}

export class HaveAccount {
  @ManyToOne((type) => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'address' })
  account: AccountEntity

  @Column()
  @Index()
  address: string
}

export class HaveAccountAndAsset extends HaveAsset {
  @ManyToOne((type) => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'address' })
  account: AccountEntity

  @Column()
  @Index()
  address: string
}
