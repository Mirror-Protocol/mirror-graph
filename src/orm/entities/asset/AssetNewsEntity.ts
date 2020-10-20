import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
} from 'typeorm'
import { HaveAsset } from '../Have'

@Entity('asset_news')
export class AssetNewsEntity extends HaveAsset {
  constructor(options: Partial<AssetNewsEntity>) {
    super()

    Object.assign(this, options)
  }

  @CreateDateColumn()
  createdAt: Date

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  datetime: Date

  @Column()
  headline: string

  @Column()
  source: string

  @Column()
  url: string

  @Column()
  summary: string
}
